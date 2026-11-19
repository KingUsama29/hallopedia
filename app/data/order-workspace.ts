import {
  formatIndonesianFullDateTime,
  isScheduleDateTimeInFuture,
  isValidIndonesianWhatsapp,
  isValidTimeInput,
  sanitizeGoogleDriveOrHttpsUrl,
  type OrderBriefSpec,
  type OrderMaterialItem,
  type OrderRecord,
  type OrderSchedulePreference,
  type OrderStatus,
  type PublicationScheduleItem,
} from './order-types.ts'

const BRIEF_ELIGIBLE_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'DP_PAID',
  'PAID',
  'INVOICE_APPROVED',
  'WAITING_INVOICE_APPROVAL',
  'BRIEF_SUBMITTED',
  'SCHEDULED',
])

export function canSubmitOrderBrief(order: OrderRecord): boolean {
  return BRIEF_ELIGIBLE_STATUSES.has(order.status)
}

export function buildInitialBriefDraft(order: OrderRecord): OrderBriefSpec {
  if (order.brief) {
    return { ...order.brief }
  }

  if (order.serviceType === 'VISIT_PRODUCTION') {
    const visitPref =
      order.schedulePreference?.serviceType === 'VISIT_PRODUCTION'
        ? order.schedulePreference
        : null
    const date = visitPref?.preferredDate ?? order.targetPublishDate ?? ''
    const time = visitPref?.preferredTimeWita ?? ''
    return {
      serviceType: 'VISIT_PRODUCTION',
      locationAddress: visitPref?.meetingLocation ?? '',
      meetingMapsUrl: visitPref?.meetingMapsUrl ?? '',
      picName: order.customerName,
      picPhone: order.customerWhatsapp,
      preferredVisitDate: date,
      preferredVisitSlot: formatIndonesianFullDateTime(date, time) ?? '',
      preferredVisitTimeWita: time,
      keyHighlights: order.initialNotes ?? '',
    }
  }

  const date = order.schedulePreference?.preferredDate ?? order.targetPublishDate ?? ''
  const time = order.schedulePreference?.preferredTimeWita ?? ''
  return {
    serviceType: 'DIRECT_POST',
    caption: '',
    mentionHandles: '',
    ctaLink: '',
    preferredPublishDate: date,
    preferredPublishTimeWita: time,
    notes: order.initialNotes ?? '',
  }
}

export function createDriveMaterialItem(
  label: string,
  rawUrl: string,
): { ok: true; item: OrderMaterialItem } | { ok: false; error: string } {
  const safeUrl = sanitizeGoogleDriveOrHttpsUrl(rawUrl)
  if (!safeUrl) {
    return {
      ok: false,
      error: 'Tautan Google Drive / aset harus diawali https:// yang valid.',
    }
  }
  const suffix = Math.random().toString(36).slice(2, 6)
  return {
    ok: true,
    item: {
      id: `mat-drv-${Date.now()}-${suffix}`,
      kind: 'GOOGLE_DRIVE',
      label: label.trim() || 'Tautan Materi Google Drive',
      urlOrFileName: safeUrl,
      addedAt: new Date().toISOString(),
    },
  }
}

export function formatReadableFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function createLocalFileMaterialItem(
  fileName: string,
  sizeBytes: number,
): { ok: true; item: OrderMaterialItem } | { ok: false; error: string } {
  const cleanName = fileName.trim()
  if (!cleanName || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: 'File materi tidak valid atau berukuran kosong.' }
  }
  const suffix = Math.random().toString(36).slice(2, 6)
  return {
    ok: true,
    item: {
      id: `mat-file-${Date.now()}-${suffix}`,
      kind: 'UPLOADED_FILE',
      label: `File Aset (${formatReadableFileSize(sizeBytes)})`,
      urlOrFileName: cleanName,
      addedAt: new Date().toISOString(),
    },
  }
}

function sanitizeMaterialList(materials: readonly OrderMaterialItem[]): OrderMaterialItem[] {
  const result: OrderMaterialItem[] = []
  for (const item of materials.slice(0, 20)) {
    if (item.kind === 'GOOGLE_DRIVE') {
      const safe = sanitizeGoogleDriveOrHttpsUrl(item.urlOrFileName)
      if (!safe) continue
      result.push({ ...item, urlOrFileName: safe })
    } else if (item.urlOrFileName.trim()) {
      result.push({ ...item, urlOrFileName: item.urlOrFileName.trim() })
    }
  }
  return result
}

export function normalizeStoredOrderRecord(order: OrderRecord): OrderRecord {
  const schedulePreference: OrderSchedulePreference =
    order.schedulePreference ??
    (order.serviceType === 'VISIT_PRODUCTION'
      ? {
          serviceType: 'VISIT_PRODUCTION',
          preferredDate: order.targetPublishDate ?? null,
          preferredTimeWita: null,
          meetingLocation: '',
          meetingMapsUrl: null,
        }
      : {
          serviceType: 'DIRECT_POST',
          preferredDate: order.targetPublishDate ?? null,
          preferredTimeWita: null,
        })

  const visitBaseFeeIdr = typeof order.visitBaseFeeIdr === 'number' ? order.visitBaseFeeIdr : 0
  const totalIdr = order.paymentSummary?.totalIdr ?? 0
  const accountsSubtotalIdr =
    typeof order.accountsSubtotalIdr === 'number'
      ? order.accountsSubtotalIdr
      : Math.max(0, totalIdr - visitBaseFeeIdr)

  return {
    ...order,
    accountsSnapshot: Array.isArray(order.accountsSnapshot) ? order.accountsSnapshot : [],
    visitBaseFeeIdr,
    accountsSubtotalIdr,
    schedulePreference,
    initialNotes: typeof order.initialNotes === 'string' ? order.initialNotes : '',
    brief: order.brief ?? null,
    materials: Array.isArray(order.materials) ? order.materials : [],
    schedules: Array.isArray(order.schedules) ? order.schedules : [],
    messages: Array.isArray(order.messages)
      ? order.messages.map((m) => ({
          ...m,
          readByCustomer: typeof m.readByCustomer === 'boolean' ? m.readByCustomer : true,
          readByAdmin: typeof m.readByAdmin === 'boolean' ? m.readByAdmin : m.senderRole !== 'CUSTOMER',
        }))
      : [],
    statusLogs: Array.isArray(order.statusLogs) ? order.statusLogs : [],
  }
}

export function buildPlannedSchedules(
  order: OrderRecord,
  date: string | null,
  timeWita: string | null,
  meetingLocation: string | null,
  preserveConfirmed: boolean = false,
): PublicationScheduleItem[] {
  const existingMap = new Map(order.schedules.map((s) => [s.accountId, s]))
  const fallbackLabel =
    order.serviceType === 'VISIT_PRODUCTION'
      ? 'Jadwal pertemuan Visit terpasang; tayang setelah produksi video'
      : 'Menunggu konfirmasi slot tayang WITA dari Admin'
  const label = formatIndonesianFullDateTime(date, timeWita) ?? fallbackLabel

  return order.accountsSnapshot.map((acc) => {
    const prev = existingMap.get(acc.id)
    const status =
      prev?.status === 'PUBLISHED'
        ? 'PUBLISHED'
        : preserveConfirmed && prev?.status === 'CONFIRMED'
          ? 'CONFIRMED'
          : 'PLANNED'
    return {
      id: prev?.id ?? `sch-${acc.id}-${Date.now()}`,
      accountId: acc.id,
      accountHandle: acc.handle,
      scheduledAtLabel: label,
      scheduledDate: date,
      scheduledTimeWita: timeWita,
      meetingLocation,
      status,
      publishedPermalink: prev?.publishedPermalink ?? null,
    }
  })
}

export function applyOrderBriefSubmission(
  order: OrderRecord,
  payload: { brief: OrderBriefSpec; materials: readonly OrderMaterialItem[] },
): { ok: true; order: OrderRecord } | { ok: false; error: string } {
  if (!canSubmitOrderBrief(order)) {
    return {
      ok: false,
      error: 'Selesaikan pembayaran DP / Penuh terlebih dahulu sebelum mengirim brief pesanan.',
    }
  }
  if (payload.brief.serviceType !== order.serviceType) {
    return { ok: false, error: 'Format brief tidak sesuai jenis layanan pesanan.' }
  }

  const prevDate = (order.schedulePreference?.preferredDate ?? order.targetPublishDate ?? '').trim()
  const prevTime = (order.schedulePreference?.preferredTimeWita ?? '').trim()
  const prevLocation =
    order.schedulePreference?.serviceType === 'VISIT_PRODUCTION'
      ? order.schedulePreference.meetingLocation.trim()
      : ''

  let cleanBrief: OrderBriefSpec
  let nextSchedulePref: OrderSchedulePreference
  let logDetail: string

  if (payload.brief.serviceType === 'DIRECT_POST') {
    const caption = payload.brief.caption.trim()
    if (caption.length < 5) {
      return { ok: false, error: 'Caption publikasi wajib diisi minimal 5 karakter.' }
    }
    const rawCta = payload.brief.ctaLink.trim()
    const safeCta = rawCta ? sanitizeGoogleDriveOrHttpsUrl(rawCta) : ''
    if (rawCta && !safeCta) {
      return { ok: false, error: 'Tautan CTA tujuan harus diawali https:// yang valid.' }
    }

    const date = payload.brief.preferredPublishDate.trim()
    const time = (payload.brief.preferredPublishTimeWita ?? '').trim()
    if (time && !date) {
      return { ok: false, error: 'Pilih tanggal tayang terlebih dahulu sebelum menentukan jam WITA.' }
    }
    if (time && !isValidTimeInput(time)) {
      return { ok: false, error: 'Format jam tayang WITA tidak valid.' }
    }
    if (!isScheduleDateTimeInFuture(date, time)) {
      return { ok: false, error: 'Tanggal dan jam tayang tidak boleh di masa lalu.' }
    }

    cleanBrief = {
      serviceType: 'DIRECT_POST',
      caption,
      mentionHandles: payload.brief.mentionHandles.trim(),
      ctaLink: safeCta ?? '',
      preferredPublishDate: date,
      preferredPublishTimeWita: time || null,
      notes: payload.brief.notes.trim(),
    }
    nextSchedulePref = {
      serviceType: 'DIRECT_POST',
      preferredDate: date || null,
      preferredTimeWita: time || null,
    }
    const label = formatIndonesianFullDateTime(date || null, time || null)
    logDetail = label
      ? `Brief publikasi langsung & materi tersimpan untuk target ${label}.`
      : 'Brief publikasi langsung & materi berhasil dikirim; menunggu jadwal slot dari Admin.'
  } else {
    const locationAddress = payload.brief.locationAddress.trim()
    if (locationAddress.length < 5) {
      return { ok: false, error: 'Alamat/lokasi pertemuan tim produksi wajib diisi minimal 5 karakter.' }
    }
    const rawMaps = (payload.brief.meetingMapsUrl ?? '').trim()
    const safeMaps = rawMaps ? sanitizeGoogleDriveOrHttpsUrl(rawMaps) : null
    if (rawMaps && !safeMaps) {
      return { ok: false, error: 'Tautan Google Maps lokasi harus diawali https:// yang valid.' }
    }
    const picName = payload.brief.picName.trim()
    if (picName.length < 2) {
      return { ok: false, error: 'Nama PIC di lokasi wajib diisi minimal 2 karakter.' }
    }
    if (!isValidIndonesianWhatsapp(payload.brief.picPhone)) {
      return { ok: false, error: 'Nomor WhatsApp PIC lokasi tidak valid (contoh: 0812xxxxxxxx).' }
    }
    const date = payload.brief.preferredVisitDate.trim()
    const time = (payload.brief.preferredVisitTimeWita ?? '').trim()
    if (!date || !time || !isValidTimeInput(time)) {
      return { ok: false, error: 'Tanggal dan jam pertemuan Visit (WITA) wajib ditentukan.' }
    }
    if (!isScheduleDateTimeInFuture(date, time)) {
      return { ok: false, error: 'Tanggal dan jam pertemuan Visit tidak boleh di masa lalu.' }
    }

    const formattedSlot = formatIndonesianFullDateTime(date, time) ?? `${date} ${time} WITA`
    cleanBrief = {
      serviceType: 'VISIT_PRODUCTION',
      locationAddress,
      meetingMapsUrl: safeMaps,
      picName,
      picPhone: payload.brief.picPhone.trim(),
      preferredVisitDate: date,
      preferredVisitSlot: formattedSlot,
      preferredVisitTimeWita: time,
      keyHighlights: payload.brief.keyHighlights.trim(),
    }
    nextSchedulePref = {
      serviceType: 'VISIT_PRODUCTION',
      preferredDate: date,
      preferredTimeWita: time,
      meetingLocation: locationAddress,
      meetingMapsUrl: safeMaps,
    }
    logDetail = `Brief Visit & janji pertemuan tim produksi dikirim untuk ${formattedSlot} di ${locationAddress}.`
  }

  const nextLocation =
    nextSchedulePref.serviceType === 'VISIT_PRODUCTION'
      ? nextSchedulePref.meetingLocation.trim()
      : ''
  const scheduleChanged =
    (nextSchedulePref.preferredDate ?? '') !== prevDate ||
    (nextSchedulePref.preferredTimeWita ?? '') !== prevTime ||
    (order.serviceType === 'VISIT_PRODUCTION' && nextLocation !== prevLocation)

  const preserveConfirmed = order.status === 'SCHEDULED' && !scheduleChanged
  const nextSchedules = buildPlannedSchedules(
    order,
    nextSchedulePref.preferredDate,
    nextSchedulePref.preferredTimeWita,
    nextLocation || null,
    preserveConfirmed,
  )

  const nowIso = new Date().toISOString()
  const cleanMaterials = sanitizeMaterialList(payload.materials)
  const nextStatus: OrderStatus =
    order.status === 'PUBLISHED'
      ? 'PUBLISHED'
      : preserveConfirmed
        ? 'SCHEDULED'
        : 'BRIEF_SUBMITTED'

  const finalLogDetail =
    order.status === 'SCHEDULED' && scheduleChanged
      ? `${logDetail} Perubahan jadwal oleh pelanggan — menunggu konfirmasi ulang Admin.`
      : logDetail

  return {
    ok: true,
    order: {
      ...order,
      status: nextStatus,
      brief: cleanBrief,
      materials: cleanMaterials,
      schedulePreference: nextSchedulePref,
      targetPublishDate: nextSchedulePref.preferredDate,
      schedules: nextSchedules,
      updatedAt: nowIso,
      statusLogs: [
        { id: `log-brf-${Date.now()}`, status: nextStatus, note: finalLogDetail, createdAt: nowIso },
        ...order.statusLogs,
      ],
      messages: [
        ...order.messages,
        {
          id: `msg-brf-${Date.now()}`,
          senderRole: 'SYSTEM',
          senderName: 'Sistem Brief Hallopedia',
          text: `${finalLogDetail} (${cleanMaterials.length} lampiran materi tercatat).`,
          sentAt: nowIso,
          readByCustomer: true,
          readByAdmin: true,
        },
      ],
    },
  }
}
