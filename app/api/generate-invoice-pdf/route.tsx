import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getInvoiceById, updateInvoice } from '@/lib/db/invoices';
import { getClientByIdForPortal } from '@/lib/db/clients';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { InvoicePDFTemplate } from '@/components/invoices/InvoicePDFTemplate';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit, formatResetTime } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Authenticate: only logged-in team members can generate PDFs
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by user ID
    const { success: allowed, resetMs } = checkRateLimit('generate-pdf:' + user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many PDF requests. Please try again in ${formatResetTime(resetMs)}.` },
        { status: 429 }
      );
    }

    let body: { invoiceId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { invoiceId } = body;

    if (!invoiceId || typeof invoiceId !== 'string') {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
    }

    // getInvoiceById now enforces org_id scoping internally
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice.client_id) {
      return NextResponse.json({ error: 'Invoice has no associated client' }, { status: 400 });
    }

    // Invoice is already org-scoped; fetch client without double org check
    const client = await getClientByIdForPortal(invoice.client_id);

    // Cast needed: renderToBuffer expects DocumentProps element; our wrapper satisfies the contract at runtime
    const element = React.createElement(InvoicePDFTemplate, { invoice, client }) as Parameters<typeof renderToBuffer>[0];
    const pdfBuffer = await renderToBuffer(element);
    // Convert to Uint8Array for Supabase storage compatibility
    const buffer = new Uint8Array(pdfBuffer);

    const fileName = `${invoiceId}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('invoices')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('invoices')
      .getPublicUrl(fileName);

    const pdf_url = urlData.publicUrl;
    const updated = await updateInvoice(invoiceId, { pdf_url });

    return NextResponse.json({ pdf_url, invoice: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
