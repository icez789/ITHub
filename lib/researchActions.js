'use server';

import { revalidatePath } from 'next/cache';

import {
  createResearchCampaign,
  grantResearchAnalyticsConsent,
  submitResearchEvaluation,
  submitResearchFeedback,
  transitionResearchCampaign,
  triageResearchFeedback,
  updateResearchCampaign,
  withdrawResearchAnalyticsConsent,
  withdrawResearchEvaluation,
} from './research';
import { PILOT_ANALYTICS_NOTICE_VERSION } from './researchQuestionnaire';

function value(formData, name) {
  return formData?.get?.(name) ?? '';
}

function optionalValue(formData, name) {
  const entry = value(formData, name);
  return entry === '' ? null : entry;
}

function utcDateTimeValue(formData, name) {
  const entry = optionalValue(formData, name);
  if (entry == null) return null;
  const text = String(entry).trim();
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text) ? `${text}:00.000Z` : text;
}

function campaignInput(formData) {
  return {
    slug: value(formData, 'slug'),
    name: value(formData, 'name'),
    dataScope: value(formData, 'dataScope') || 'pilot',
    questionnaireVersion: value(formData, 'questionnaireVersion'),
    consentNoticeVersion: value(formData, 'consentNoticeVersion'),
    eligibleMemberCount: optionalValue(formData, 'eligibleMemberCount'),
    startsAt: utcDateTimeValue(formData, 'startsAt'),
    endsAt: utcDateTimeValue(formData, 'endsAt'),
    retentionUntil: utcDateTimeValue(formData, 'retentionUntil'),
  };
}

function failedAction(message = 'ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่') {
  return { success: false, message };
}

export async function createResearchCampaignAction(_previousState, formData) {
  try {
    const result = await createResearchCampaign(campaignInput(formData));
    revalidatePath('/admin/analytics');
    return { success: true, message: 'สร้างรอบประเมินแบบร่างแล้ว', result };
  } catch {
    return failedAction('สร้างรอบประเมินไม่สำเร็จ กรุณาตรวจข้อมูลและสิทธิ์');
  }
}

export async function updateResearchCampaignAction(_previousState, formData) {
  try {
    const result = await updateResearchCampaign(
      value(formData, 'campaignId'),
      campaignInput(formData),
    );
    if (result.status === 'not_found') return failedAction('ไม่พบรอบประเมิน');
    if (result.status === 'immutable') return failedAction('แก้ไขได้เฉพาะรอบที่เป็นแบบร่าง');
    revalidatePath('/admin/analytics');
    return { success: true, message: 'บันทึกรอบประเมินแล้ว', result };
  } catch {
    return failedAction('บันทึกรอบประเมินไม่สำเร็จ กรุณาตรวจข้อมูลและสิทธิ์');
  }
}

export async function transitionResearchCampaignAction(_previousState, formData) {
  try {
    const result = await transitionResearchCampaign(
      value(formData, 'campaignId'),
      value(formData, 'nextStatus'),
    );
    if (result.status === 'not_found') return failedAction('ไม่พบรอบประเมิน');
    revalidatePath('/admin/analytics');
    revalidatePath('/feedback');
    return { success: true, message: 'เปลี่ยนสถานะรอบประเมินแล้ว', result };
  } catch {
    return failedAction('เปลี่ยนสถานะไม่ได้ กรุณาตรวจลำดับสถานะ ข้อมูล และสิทธิ์');
  }
}

export async function submitResearchEvaluationAction(_previousState, formData) {
  try {
    const result = await submitResearchEvaluation({
      campaignId: value(formData, 'campaignId'),
      clientSubmissionId: value(formData, 'clientSubmissionId'),
      respondentType: value(formData, 'respondentType'),
      experienceLevel: value(formData, 'experienceLevel'),
      primaryDevice: value(formData, 'primaryDevice'),
      consentAcknowledged: value(formData, 'evaluationConsent') === 'accepted',
      susAnswers: Array.from({ length: 10 }, (_, index) => value(formData, `sus_${index + 1}`)),
      taskResults: Array.from({ length: 5 }, (_, index) => ({
        taskId: index + 1,
        result: value(formData, `task_${index + 1}_result`),
        difficulty: optionalValue(formData, `task_${index + 1}_difficulty`),
      })),
      openFeedback: optionalValue(formData, 'openFeedback'),
    });
    if (result.status === 'campaign_unavailable') {
      return failedAction('รอบประเมินยังไม่เปิดหรือสิ้นสุดแล้ว');
    }
    if (result.status === 'withdrawn_locked') {
      return failedAction('คำตอบรอบนี้ถูกถอนแล้วและยังไม่อนุญาตให้ส่งใหม่');
    }
    revalidatePath('/feedback');
    return {
      success: true,
      message: result.status === 'already_submitted'
        ? 'ระบบมีคำตอบของคุณสำหรับรอบนี้แล้ว'
        : 'ส่งแบบประเมินแล้ว',
      result,
    };
  } catch {
    return failedAction('ส่งแบบประเมินไม่สำเร็จ กรุณาตรวจคำตอบทุกข้อ');
  }
}

export async function withdrawResearchEvaluationAction(_previousState, formData) {
  try {
    const result = await withdrawResearchEvaluation(value(formData, 'campaignId'));
    if (result.status === 'not_found') return failedAction('ไม่พบคำตอบที่ต้องการถอน');
    revalidatePath('/feedback');
    return { success: true, message: 'ถอนและล้างเนื้อหาคำตอบแล้ว', result };
  } catch {
    return failedAction('ถอนคำตอบไม่สำเร็จ กรุณาลองใหม่');
  }
}

export async function submitResearchFeedbackAction(_previousState, formData) {
  try {
    const result = await submitResearchFeedback({
      campaignId: optionalValue(formData, 'campaignId'),
      clientSubmissionId: value(formData, 'clientSubmissionId'),
      category: value(formData, 'category'),
      rating: optionalValue(formData, 'rating'),
      details: value(formData, 'details'),
      route: value(formData, 'route'),
    });
    if (result.status === 'campaign_unavailable') {
      return failedAction('รอบที่เลือกยังไม่เปิดหรือสิ้นสุดแล้ว');
    }
    revalidatePath('/feedback');
    revalidatePath('/admin/feedback');
    return {
      success: true,
      message: result.idempotent ? 'ระบบรับ Feedback รายการนี้ไว้แล้ว' : 'ส่ง Feedback แล้ว',
      result,
    };
  } catch {
    return failedAction('ส่ง Feedback ไม่สำเร็จ กรุณาตรวจรายละเอียด');
  }
}

export async function triageResearchFeedbackAction(_previousState, formData) {
  try {
    const result = await triageResearchFeedback(value(formData, 'feedbackId'), {
      status: value(formData, 'status'),
      priority: value(formData, 'priority'),
      issueTheme: optionalValue(formData, 'issueTheme'),
      internalNote: optionalValue(formData, 'internalNote'),
    });
    if (result.status === 'not_found') return failedAction('ไม่พบ Feedback');
    revalidatePath('/admin/feedback');
    revalidatePath('/feedback');
    return { success: true, message: 'อัปเดต Feedback แล้ว', result };
  } catch {
    return failedAction('อัปเดต Feedback ไม่สำเร็จ กรุณาตรวจข้อมูลและสิทธิ์');
  }
}

export async function grantResearchAnalyticsConsentAction(_previousState, formData) {
  if (value(formData, 'acknowledged') !== 'accepted') {
    return failedAction('กรุณายืนยันความยินยอมก่อนเปิด Research Analytics');
  }
  try {
    const result = await grantResearchAnalyticsConsent(PILOT_ANALYTICS_NOTICE_VERSION);
    revalidatePath('/feedback');
    return { success: true, message: 'บันทึกความยินยอมแล้ว', result };
  } catch {
    return failedAction('บันทึกความยินยอมไม่สำเร็จ กรุณาลองใหม่');
  }
}

export async function withdrawResearchAnalyticsConsentAction(_previousState, _formData) {
  try {
    const result = await withdrawResearchAnalyticsConsent();
    revalidatePath('/feedback');
    return { success: true, message: 'ถอนความยินยอมและลบ Raw Analytics แล้ว', result };
  } catch {
    return failedAction('ถอนความยินยอมไม่สำเร็จ กรุณาลองใหม่');
  }
}
