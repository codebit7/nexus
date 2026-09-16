import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';

export interface InvoicePDFData {
  invoice_number: string | null;
  amount: number | null;
  due_date: string | null;
  status: string | null;
  created_at: string | null;
}

export interface ClientPDFData {
  name: string;
  email: string | null;
}

interface Props {
  invoice: InvoicePDFData;
  client: ClientPDFData;
}

function fmt(amount: number | null): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function statusColors(status: string | null) {
  switch (status) {
    case 'paid':    return { bg: '#d1fae5', text: '#065f46' };
    case 'overdue': return { bg: '#fee2e2', text: '#991b1b' };
    default:        return { bg: '#fef3c7', text: '#92400e' };
  }
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingBottom: 60,
  },
  // ── Header ─────────────────────────────────────────────────────
  header: {
    backgroundColor: '#0e0f14',
    paddingHorizontal: 48,
    paddingTop: 36,
    paddingBottom: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBox: {
    width: 28,
    height: 28,
    backgroundColor: '#7c3aed',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  brandLetter: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  brandName: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  brandSub: {
    color: '#6b7280',
    fontSize: 8,
    marginTop: 3,
    marginLeft: 37,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  invoiceLabel: {
    color: '#6b7280',
    fontSize: 8,
    letterSpacing: 2,
  },
  invoiceNum: {
    color: '#a78bfa',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  // ── Body ────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 48,
    paddingTop: 40,
  },
  // ── Meta row ────────────────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  metaLabel: {
    color: '#9ca3af',
    fontSize: 8,
    letterSpacing: 1,
    marginBottom: 5,
    fontFamily: 'Helvetica',
  },
  metaValue: {
    color: '#111827',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  metaValueSub: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  // ── Divider ─────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 28,
  },
  // ── Line items ──────────────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    marginBottom: 2,
  },
  thDesc: { flex: 1 },
  thAmt:  { width: 100, textAlign: 'right' },
  thText: {
    color: '#9ca3af',
    fontSize: 8,
    letterSpacing: 1,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tdDesc: { flex: 1 },
  tdAmt:  { width: 100, textAlign: 'right' },
  tdText: {
    color: '#374151',
    fontSize: 10,
  },
  tdTextBold: {
    color: '#111827',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  // ── Totals ──────────────────────────────────────────────────────
  totalsOuter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  totalsBlock: {
    width: 220,
  },
  totalsFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#7c3aed',
    marginTop: 4,
  },
  totalsFinalLabel: {
    color: '#111827',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  totalsFinalValue: {
    color: '#7c3aed',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  footerText: {
    color: '#d1d5db',
    fontSize: 8,
  },
});

export function InvoicePDFTemplate({ invoice, client }: Props) {
  const sc = statusColors(invoice.status);
  const statusLabel = invoice.status
    ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
    : 'Pending';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <View style={s.brandRow}>
              <View style={s.brandBox}>
                <Text style={s.brandLetter}>N</Text>
              </View>
              <Text style={s.brandName}>Nexus</Text>
            </View>
            <Text style={s.brandSub}>Creative Agency</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNum}>{invoice.invoice_number ?? 'N/A'}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={s.body}>
          {/* Meta row: Bill To / Invoice Info */}
          <View style={s.metaRow}>
            <View>
              <Text style={s.metaLabel}>BILL TO</Text>
              <Text style={s.metaValue}>{client.name}</Text>
              {client.email ? (
                <Text style={s.metaValueSub}>{client.email}</Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.metaLabel}>ISSUE DATE</Text>
              <Text style={[s.metaValue, { fontSize: 11 }]}>
                {fmtDate(invoice.created_at)}
              </Text>
              <Text style={[s.metaLabel, { marginTop: 16 }]}>DUE DATE</Text>
              <Text style={[s.metaValue, { fontSize: 11 }]}>
                {fmtDate(invoice.due_date)}
              </Text>
              <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[s.statusText, { color: sc.text }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.divider} />

          {/* Line items */}
          <View style={s.tableHeader}>
            <View style={s.thDesc}>
              <Text style={s.thText}>DESCRIPTION</Text>
            </View>
            <View style={s.thAmt}>
              <Text style={s.thText}>AMOUNT</Text>
            </View>
          </View>

          <View style={s.tableRow}>
            <View style={s.tdDesc}>
              <Text style={s.tdTextBold}>Professional Services</Text>
              <Text style={[s.tdText, { marginTop: 3, color: '#9ca3af', fontSize: 9 }]}>
                Per agreement — {fmtDate(invoice.due_date)}
              </Text>
            </View>
            <View style={s.tdAmt}>
              <Text style={s.tdTextBold}>{fmt(invoice.amount)}</Text>
            </View>
          </View>

          {/* Totals */}
          <View style={s.totalsOuter}>
            <View style={s.totalsBlock}>
              <View style={s.totalsFinalRow}>
                <Text style={s.totalsFinalLabel}>Total Due</Text>
                <Text style={s.totalsFinalValue}>{fmt(invoice.amount)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Nexus Creative Agency · Generated automatically</Text>
          <Text style={s.footerText}>{invoice.invoice_number ?? ''}</Text>
        </View>
      </Page>
    </Document>
  );
}

export default InvoicePDFTemplate;
