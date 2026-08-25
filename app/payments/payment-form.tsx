'use client';

import { useActionState } from 'react';
import { recordPaymentAction, type PaymentFormState } from '../jobs/actions';

export function PaymentForm({ jobId, remainingBaht }: { jobId: string; remainingBaht: number }) {
  const [state, action, pending] = useActionState(recordPaymentAction, {} as PaymentFormState);
  return <form action={action} className="payment-form" encType="multipart/form-data">
    <input type="hidden" name="jobId" value={jobId}/>
    <label><span>ประเภทการรับเงิน</span><select name="paymentType" defaultValue="DEPOSIT"><option value="DEPOSIT">มัดจำ</option><option value="INSTALLMENT">แบ่งชำระ</option><option value="FINAL">ชำระงวดสุดท้าย</option></select></label>
    <label><span>จำนวนเงิน (บาท)</span><input name="amountBaht" type="number" min="0.01" max={remainingBaht} step="0.01" required/></label>
    <label><span>วิธีชำระ</span><select name="method"><option value="PROMPTPAY">PromptPay</option><option value="BANK_TRANSFER">โอนธนาคาร</option><option value="CASH">เงินสด</option><option value="OTHER">อื่น ๆ</option></select></label>
    <label><span>เลขอ้างอิง</span><input name="reference"/></label>
    <label><span>แนบสลิป (ไม่เกิน 5 MB)</span><input name="slip" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"/></label>
    <label><span>หมายเหตุ</span><input name="note"/></label>
    {state.error?<p className="form-error" role="alert">{state.error}</p>:null}{state.success?<p className="form-success" role="status">{state.success}</p>:null}
    <button className="primary-button" disabled={pending}>{pending?'กำลังบันทึก…':'บันทึกรับชำระ'}</button>
  </form>;
}

