/**
 * generate-pdf-report
 *
 * Generates a Turkish progress report PDF for a given student.
 *
 * Auth: admin  OR  teacher linked to the student  OR  the student themselves.
 * Body: { student_id: string, since?: string (ISO date) }
 * Returns: { html: string, student: string }
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Helpers ────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  return null
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status)
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function userClient(req: Request): SupabaseClient {
  const url  = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) throw new Error('SUPABASE_URL or SUPABASE_ANON_KEY missing')
  const auth = req.headers.get('Authorization') ?? ''
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth:   { persistSession: false, autoRefreshToken: false },
  })
}

async function getUserId(req: Request): Promise<string | null> {
  const { data } = await userClient(req).auth.getUser()
  return data.user?.id ?? null
}

// ─── Handler ────────────────────────────────────────────────────────────────

interface Body {
  student_id:    string
  since?:        string
  /** Free-form private notes from a teacher. Rendered in a callout. Optional. */
  teacher_notes?: string
}

interface ReportMeta {
  title: string
  fileNamePrefix: string
  bucket: 'reports'
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const callerId = await getUserId(req)
  if (!callerId) return errorResponse('Unauthorized', 401)

  const sb = serviceClient()
  const { data: caller } = await sb.from('profiles').select('role').eq('id', callerId).single()

  let body: Body
  try { body = await req.json() as Body }
  catch { return errorResponse('bad body', 400) }
  if (!body.student_id) return errorResponse('student_id required', 400)

  // ── Authorization: admin OR teacher linked to student OR self ──
  const isAdmin = caller?.role === 'admin'
  const isSelf  = callerId === body.student_id

  let isLinkedTeacher = false
  if (!isAdmin && !isSelf && caller?.role === 'teacher') {
    const { data: link } = await sb
      .from('teacher_students')
      .select('teacher_id')
      .eq('teacher_id', callerId)
      .eq('student_id', body.student_id)
      .maybeSingle()
    isLinkedTeacher = !!link
  }

  if (!isAdmin && !isSelf && !isLinkedTeacher) {
    return errorResponse('forbidden', 403)
  }

  const since = body.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [pRes, cRes, sRes] = await Promise.all([
    sb.from('profiles').select('*').eq('id', body.student_id).single(),
    sb.from('student_character').select('*').eq('student_id', body.student_id).single(),
    sb.from('session_logs').select('*').eq('student_id', body.student_id)
      .gte('created_at', since).order('created_at', { ascending: false }),
  ])

  if (pRes.error || !pRes.data) return errorResponse('student not found', 404)

  const profile = pRes.data
  const char    = cRes.data ?? { total_xp: 0, level: 1, current_streak: 0, longest_streak: 0 }
  const sessions: any[] = sRes.data ?? []

  const totalSessions = sessions.length
  const totalCorrect  = sessions.reduce((s: number, x: any) => s + x.questions_correct, 0)
  const totalQs       = sessions.reduce((s: number, x: any) => s + x.questions_total, 0)
  const accuracy      = totalQs > 0 ? Math.round(100 * totalCorrect / totalQs) : 0
  const totalMinutes  = Math.round(sessions.reduce((s: number, x: any) => s + x.duration_seconds, 0) / 60)

  const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))

  const teacherNotesBlock = body.teacher_notes && body.teacher_notes.trim().length > 0
    ? `<h2>Öğretmen Notları</h2><div class="notes">${escapeHtml(body.teacher_notes).replace(/\n/g, '<br/>')}</div>`
    : ''

  const reportMeta: ReportMeta = {
    title: `Fonolog İlerleme Raporu`,
    fileNamePrefix: `fonolog-ilerleme-raporu`,
    bucket: 'reports',
  }

  const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><title>İlerleme Raporu</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
  h1 { color: #FFC857; font-size: 28px; }
  h2 { font-size: 18px; margin-top: 24px; border-bottom: 2px solid #FFC857; padding-bottom: 4px; }
  .stats { display: flex; gap: 16px; margin: 16px 0; }
  .stat { flex: 1; background: #FFF8E7; padding: 12px; border-radius: 8px; text-align: center; }
  .stat .num { font-size: 28px; font-weight: bold; color: #246B5F; }
  .stat .label { font-size: 12px; color: #5A5A5A; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th, td { padding: 6px; border-bottom: 1px solid #E2E2E2; text-align: left; }
  th { background: #FFF8E7; }
  .notes { background: #FFF8E7; padding: 12px 14px; border-left: 4px solid #FFC857; border-radius: 6px; font-size: 13px; line-height: 1.6; }
  .footer { margin-top: 24px; font-size: 10px; color: #787878; text-align: center; }
</style></head><body>
  <h1>📚 Fonolog — İlerleme Raporu</h1>
  <p><strong>${profile.full_name}</strong> · ${profile.child_age ?? '-'} yaş</p>
  <p style="color:#787878;font-size:12px">Rapor tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>

  <h2>Genel İstatistikler</h2>
  <div class="stats">
    <div class="stat"><div class="num">${char.total_xp}</div><div class="label">Toplam XP</div></div>
    <div class="stat"><div class="num">${char.level}</div><div class="label">Seviye</div></div>
    <div class="stat"><div class="num">${char.current_streak}</div><div class="label">Aktif Seri</div></div>
    <div class="stat"><div class="num">${accuracy}%</div><div class="label">Başarı</div></div>
  </div>

  <h2>Aktivite Özeti (son 30 gün)</h2>
  <ul>
    <li>Tamamlanan oturum: <strong>${totalSessions}</strong></li>
    <li>Cevaplanan soru: <strong>${totalQs}</strong></li>
    <li>Toplam süre: <strong>${totalMinutes} dakika</strong></li>
    <li>En uzun seri: <strong>${char.longest_streak} gün</strong></li>
  </ul>

  ${teacherNotesBlock}

  <h2>Son Oturumlar</h2>
  <table>
    <tr><th>Tarih</th><th>Modül</th><th>Skor</th><th>Süre</th><th>XP</th></tr>
    ${sessions.slice(0, 25).map((s: any) => `
      <tr>
        <td>${new Date(s.created_at).toLocaleDateString('tr-TR')}</td>
        <td>${s.module_id}</td>
        <td>${s.questions_correct}/${s.questions_total}</td>
        <td>${Math.round(s.duration_seconds / 60)} dk</td>
        <td>${s.xp_earned}</td>
      </tr>
    `).join('')}
  </table>

  <div class="footer">Fonolog · Villa Akademia</div>
</body></html>`

  return jsonResponse({ html, student: profile.full_name, report: reportMeta })
})
