'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { createQuotationAction, type QuotationFormState } from '../actions';

type Customer = { id: string; name: string };
type Item = { description: string; quantity: number; unit: string; unitPriceBaht: number };
const blankItem = (): Item => ({ description: '', quantity: 1, unit: 'งาน', unitPriceBaht: 0 });

export function QuotationForm({ customers }: { customers: Customer[] }) {
  const [state, action, pending] = useActionState(createQuotationAction, {} as QuotationFormState);
  const [items, setItems] = useState<Item[]>([blankItem()]);
  const [discount, setDiscount] = useState(0);
  const [vat, setVat] = useState(true);
  const [withholding, setWithholding] = useState(0);
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPriceBaht || 0), 0);
    const taxable = Math.max(subtotal - Number(discount || 0), 0);
    const vatAmount = vat ? taxable * 0.07 : 0;
    const withholdingAmount = taxable * Number(withholding || 0) / 100;
    return { subtotal, vatAmount, withholdingAmount, grandTotal: Math.max(taxable + vatAmount - withholdingAmount, 0) };
  }, [items, discount, vat, withholding]);
  const baht = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value);
  const updateItem = (index: number, patch: Partial<Item>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));

  return <form action={action} className="data-form">
    <input type="hidden" name="items" value={JSON.stringify(items)} />
    <div className="form-grid"><label><span>ลูกค้า *</span><select name="customerId" required><option value="">เลือกลูกค้า</option>{customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}</option>)}</select></label><label><span>ใช้ได้ถึงวันที่</span><input name="validUntil" type="date" /></label><label className="span-2"><span>หัวข้อใบเสนอราคา *</span><input name="title" placeholder="เช่น ป้ายหน้าร้านและงานติดตั้ง" required /></label></div>
    <section className="line-items"><div className="subsection-heading"><div><h2>รายการเสนอราคา</h2><p>ระบุจำนวน หน่วย และราคาต่อหน่วย</p></div><button className="secondary-button" type="button" onClick={() => setItems((current) => [...current, blankItem()])}><Plus size={15} />เพิ่มรายการ</button></div>{items.map((item, index) => <div className="line-item" key={index}><label><span>รายละเอียด</span><input value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} required /></label><label><span>จำนวน</span><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} required /></label><label><span>หน่วย</span><input value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} required /></label><label><span>ราคา/หน่วย</span><input type="number" min="0" step="0.01" value={item.unitPriceBaht} onChange={(event) => updateItem(index, { unitPriceBaht: Number(event.target.value) })} required /></label><button className="icon-button" type="button" title="ลบรายการ" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></button></div>)}</section>
    <div className="quotation-options"><div className="form-grid"><label><span>ส่วนลด (บาท)</span><input name="discountBaht" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label><label><span>หัก ณ ที่จ่าย</span><select name="withholdingRate" value={withholding} onChange={(event) => setWithholding(Number(event.target.value))}><option value="0">ไม่หัก</option><option value="1">1%</option><option value="3">3%</option><option value="5">5%</option></select></label><label className="checkbox-field span-2"><input name="includeVat" type="checkbox" checked={vat} onChange={(event) => setVat(event.target.checked)} /><span>คิด VAT 7%</span></label><label className="span-2"><span>หมายเหตุ</span><textarea name="note" rows={3} /></label></div><aside className="quote-total"><span>ยอดก่อนส่วนลด<strong>{baht(totals.subtotal)}</strong></span><span>VAT<strong>{baht(totals.vatAmount)}</strong></span><span>หัก ณ ที่จ่าย<strong>-{baht(totals.withholdingAmount)}</strong></span><span className="grand">ยอดสุทธิ<strong>{baht(totals.grandTotal)}</strong></span></aside></div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<div className="form-actions"><Link className="secondary-button" href="/quotations">ยกเลิก</Link><button className="primary-button" disabled={pending}>{pending ? 'กำลังสร้าง…' : 'สร้างใบเสนอราคา'}</button></div>
  </form>;
}

