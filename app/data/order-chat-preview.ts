import { sanitizeInstagramPermalink } from './catalog.ts'
import {
  formatIndonesianFullDateTime,
  getLocalTodayIsoDate,
  type OrderRecord,
  type OrderSchedulePreference,
  type PublicationScheduleItem,
} from './order-types.ts'
import { buildPlannedSchedules } from './order-workspace.ts'

function addOneDayIso(baseIso: string): string {
  const [y, m, d] = baseIso.split('-').map(Number)
  if (!y || !m || !d) return baseIso
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

export type AdminPreviewAction =
  | { type: 'MARK_CUSTOMER_MESSAGES_READ' }
  | { type: 'REPLY_CHAT'; text?: string }
  | { type: 'CONFIRM_SCHEDULE'; date?: string; timeWita?: string }
  | { type: 'MARK_PUBLISHED'; instagramUrl: string }

export function appendCustomerChatMessage(
  order: OrderRecord,
  rawText: string,
): { ok: true; order: OrderRecord } | { ok: false; error: string } {
  const text = rawText.trim()
  if (!text) return { ok: false, error: 'Tulis pesan terlebih dahulu sebelum mengirim.' }
  if (text.length > 1000) return { ok: false, error: 'Panjang pesan maksimal 1.000 karakter.' }

  const nowIso = new Date().toISOString()
  return {
    ok: true,
    order: {
      ...order,
      updatedAt: nowIso,
      messages: [
        ...order.messages,
        {
          id: `msg-cust-${Date.now()}`,
          senderRole: 'CUSTOMER',
          senderName: order.brandName || order.customerName,
          text,
          sentAt: nowIso,
          readByCustomer: true,
          readByAdmin: false,
        },
      ],
    },
  }
}

export function markAdminMessagesRead(order: OrderRecord): OrderRecord {
  const hasUnread = order.messages.some((m) => m.senderRole === 'ADMIN' && !m.readByCustomer)
  if (!hasUnread) return order
  return {
    ...order,
    messages: order.messages.map((m) =>
      m.senderRole === 'ADMIN' && !m.readByCustomer ? { ...m, readByCustomer: true } : m,
    ),
  }
}

function withCustomerMessagesReadByAdmin(messages: readonly OrderRecord['messages'][number][]) {
  return messages.map((m) =>
    m.senderRole === 'CUSTOMER' && !m.readByAdmin ? { ...m, readByAdmin: true } : m,
  )
}

export function applyPreviewAdminAction(
  order: OrderRecord,
  action: AdminPreviewAction,
): { ok: true; order: OrderRecord } | { ok: false; error: string } {
  if (order.status === 'CANCELLED') {
    return {
      ok: false,
      error: 'Pesanan yang sudah dibatalkan tidak dapat diperbarui atau dijadwalkan ulang.',
    }
  }
  const nowIso = new Date().toISOString()
  const syncedMessages = withCustomerMessagesReadByAdmin(order.messages)

  if (action.type === 'MARK_CUSTOMER_MESSAGES_READ') {
    return {
      ok: true,
      order: {
        ...order,
        updatedAt: nowIso,
        messages: syncedMessages,
      },
    }
  }

  if (action.type === 'REPLY_CHAT') {
    const scheduleHint = formatIndonesianFullDateTime(
      order.schedulePreference?.preferredDate ?? order.targetPublishDate,
      order.schedulePreference?.preferredTimeWita ?? null,
    )
    const fallbackReply =
      order.serviceType === 'VISIT_PRODUCTION'
        ? `Halo ${order.brandName}, tim produksi kami sudah meninjau brief Visit${scheduleHint ? ` untuk jadwal ${scheduleHint}` : ''}. Kami akan segera menghubungi PIC sebelum tim berangkat ke lokasi.`
        : `Halo ${order.brandName}, materi & brief untuk ${order.orderCode} sudah kami terima${scheduleHint ? ` (target ${scheduleHint})` : ''}. Admin siap memproses antrean publikasi.`
    const text = action.text?.trim() || fallbackReply
    return {
      ok: true,
      order: {
        ...order,
        updatedAt: nowIso,
        messages: [
          ...syncedMessages,
          {
            id: `msg-adm-${Date.now()}`,
            senderRole: 'ADMIN',
            senderName: 'Admin Operasional Hallopedia',
            text,
            sentAt: nowIso,
            readByCustomer: false,
            readByAdmin: true,
          },
        ],
      },
    }
  }

  const visitLocation =
    order.schedulePreference?.serviceType === 'VISIT_PRODUCTION'
      ? order.schedulePreference.meetingLocation
      : order.brief?.serviceType === 'VISIT_PRODUCTION'
        ? order.brief.locationAddress
        : ''
  const visitMapsUrl =
    order.schedulePreference?.serviceType === 'VISIT_PRODUCTION'
      ? order.schedulePreference.meetingMapsUrl
      : order.brief?.serviceType === 'VISIT_PRODUCTION'
        ? (order.brief.meetingMapsUrl ?? null)
        : null

  if (action.type === 'CONFIRM_SCHEDULE') {
    const fallbackFutureDate = addOneDayIso(getLocalTodayIsoDate())
    const date = (
      action.date ??
      order.schedulePreference?.preferredDate ??
      order.targetPublishDate ??
      fallbackFutureDate
    ).trim() || fallbackFutureDate
    const time = (action.timeWita ?? order.schedulePreference?.preferredTimeWita ?? '19:00').trim()
    const formatted = formatIndonesianFullDateTime(date, time) ?? 'Sesuai kesepakatan Admin'
    const baseSchedules = order.schedules.length
      ? order.schedules
      : buildPlannedSchedules(order, date, time, visitLocation || null)
    const confirmedSchedules: PublicationScheduleItem[] = baseSchedules.map((s) => ({
      ...s,
      scheduledAtLabel: formatted,
      scheduledDate: date,
      scheduledTimeWita: time,
      meetingLocation: visitLocation || s.meetingLocation || null,
      status: s.status === 'PUBLISHED' ? 'PUBLISHED' : 'CONFIRMED',
    }))
    const nextSchedulePreference: OrderSchedulePreference =
      order.serviceType === 'VISIT_PRODUCTION'
        ? {
            serviceType: 'VISIT_PRODUCTION',
            preferredDate: date,
            preferredTimeWita: time,
            meetingLocation: visitLocation,
            meetingMapsUrl: visitMapsUrl,
          }
        : {
            serviceType: 'DIRECT_POST',
            preferredDate: date,
            preferredTimeWita: time,
          }
    const note =
      order.serviceType === 'VISIT_PRODUCTION'
        ? `Jadwal kunjungan tim produksi dikonfirmasi resmi: ${formatted}.`
        : `Slot publikasi di ${order.accountsSnapshot.length} akun dikonfirmasi: ${formatted}.`
    return {
      ok: true,
      order: {
        ...order,
        status: 'SCHEDULED',
        schedulePreference: nextSchedulePreference,
        targetPublishDate: date,
        schedules: confirmedSchedules,
        updatedAt: nowIso,
        statusLogs: [{ id: `log-sch-${Date.now()}`, status: 'SCHEDULED', note, createdAt: nowIso }, ...order.statusLogs],
        messages: [
          ...syncedMessages,
          {
            id: `msg-adm-sch-${Date.now()}`,
            senderRole: 'ADMIN',
            senderName: 'Admin Operasional Hallopedia',
            text: note,
            sentAt: nowIso,
            readByCustomer: false,
            readByAdmin: true,
          },
        ],
      },
    }
  }

  const safeIgUrl = sanitizeInstagramPermalink(action.instagramUrl)
  if (!safeIgUrl) {
    return {
      ok: false,
      error: 'Tautan bukti tayang harus berupa link resmi https://www.instagram.com/...',
    }
  }
  const baseSchedules = order.schedules.length
    ? order.schedules
    : buildPlannedSchedules(
        order,
        order.schedulePreference?.preferredDate ?? order.targetPublishDate,
        order.schedulePreference?.preferredTimeWita ?? null,
        visitLocation || null,
      )
  const publishedSchedules: PublicationScheduleItem[] = baseSchedules.map((s) => ({
    ...s,
    status: 'PUBLISHED',
    publishedPermalink: safeIgUrl,
  }))
  const note = `Konten kampanye ${order.orderCode} sudah tayang di jaringan Hallopedia (${safeIgUrl}).`
  return {
    ok: true,
    order: {
      ...order,
      status: 'PUBLISHED',
      schedules: publishedSchedules,
      updatedAt: nowIso,
      statusLogs: [{ id: `log-pub-${Date.now()}`, status: 'PUBLISHED', note, createdAt: nowIso }, ...order.statusLogs],
      messages: [
        ...syncedMessages,
        {
          id: `msg-adm-pub-${Date.now()}`,
          senderRole: 'ADMIN',
          senderName: 'Admin Operasional Hallopedia',
          text: `${note} Terima kasih telah beriklan bersama Hallopedia.`,
          sentAt: nowIso,
          readByCustomer: false,
          readByAdmin: true,
        },
      ],
    },
  }
}

