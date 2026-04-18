import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Path,
} from '@react-pdf/renderer';

// ── Types ──
interface ItemResponse {
  response: 'ok' | 'nc' | 'na' | null;
  observation: string;
  photos: string[];
  actionPlan?: {
    responsible: string;
    deadline: string;
    priority: string;
  };
}

interface NRChecklist {
  id: number;
  nrNumber: string;
  nrName: string;
  items: { id: string; text: string }[];
}

interface NonConformity {
  nrNumber: string;
  nrName: string;
  item: { id: string; text: string };
  data: ItemResponse;
}

export interface InspectionPDFProps {
  inspectionId: number;
  inspData: any;
  selectedNRs: NRChecklist[];
  nonConformities: NonConformity[];
  responses: Record<string, ItemResponse>;
  companyLogo?: string;
  okCount: number;
  ncCount: number;
  naCount: number;
  totalAnswered: number;
  conformityScore: number;
}

// ── Helpers ──
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDateShort = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR');

const getPriority = (p: string) => {
  if (p === 'alta') return { text: 'ALTA', color: '#dc2626' };
  if (p === 'media') return { text: 'MÉDIA', color: '#ea580c' };
  if (p === 'baixa') return { text: 'BAIXA', color: '#16a34a' };
  return { text: '-', color: '#6b7280' };
};

// ── Colors ──
const C = {
  dark: '#1a1d23',
  yellow: '#FFD100',
  red: '#dc2626',
  green: '#16a34a',
  gray: '#9ca3af',
  border: '#e5e7eb',
  bg: '#f9fafb',
  text: '#111111',
  muted: '#6b7280',
  white: '#ffffff',
};

// ── Styles ──
const s = StyleSheet.create({
  // Page — sem paddingTop, o mini-cabeçalho ocupa espaço no fluxo só nas págs 2+
  page: {
    backgroundColor: C.white,
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingBottom: 36,
  },

  // ── Mini-cabeçalho (páginas 2+) — NO fluxo, sem position absolute ──
  miniHeader: {
    height: 28,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  miniHeaderBrand: {
    fontSize: 7,
    color: '#9ca3af',
  },
  miniHeaderInspection: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },

  // ── Header ──
  header: {
    backgroundColor: C.dark,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 52,
    height: 52,
    backgroundColor: C.yellow,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  logoCheck: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },
  brandBlock: {
    flexDirection: 'column',
  },
  brandRow: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
  },
  brandSub: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  inspLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
  },
  inspNumber: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: C.yellow,
  },
  viaLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  // Variante com logo da empresa
  companyLogoBox: {
    backgroundColor: C.white,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyLogoImg: {
    height: 36,
    maxWidth: 120,
  },
  brandSmall: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  brandSmallSub: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // ── NR Bar ──
  nrBar: {
    backgroundColor: C.yellow,
    paddingVertical: 7,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  nrBarLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginRight: 10,
  },
  nrTag: {
    backgroundColor: C.dark,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginRight: 5,
    marginVertical: 1,
  },
  nrTagText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.yellow,
  },

  // ── Info Section ──
  infoSection: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    borderBottomStyle: 'solid',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 8,
    color: C.muted,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  obsBox: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.bg,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: C.yellow,
    borderLeftStyle: 'solid',
  },
  obsLabel: {
    fontSize: 8,
    color: C.muted,
    marginBottom: 2,
  },
  obsText: {
    fontSize: 10,
    color: '#374151',
  },

  // ── Stats ──
  statsRow: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: C.bg,
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    borderBottomStyle: 'solid',
  },
  statBox: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'solid',
  },
  statVal: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
  },
  statLbl: {
    fontSize: 8,
    marginTop: 3,
  },

  // ── NC Section ──
  ncSection: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    borderBottomStyle: 'solid',
  },
  ncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderStyle: 'solid',
    marginBottom: 12,
  },
  ncBannerIcon: {
    width: 18,
    height: 18,
    backgroundColor: C.red,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  ncBannerIconText: {
    color: C.white,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  ncBannerText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.red,
  },
  ncCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderLeftColor: C.red,
    borderLeftStyle: 'solid',
    borderRadius: 4,
  },
  ncCardHead: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ncBadge: {
    width: 20,
    height: 20,
    backgroundColor: C.red,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  ncBadgeText: {
    color: C.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  ncCardBody: {
    flex: 1,
  },
  ncCardTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
    marginBottom: 3,
  },
  ncCardNR: {
    fontSize: 9,
    color: C.muted,
  },
  ncObsBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: C.bg,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#d1d5db',
    borderLeftStyle: 'solid',
  },
  ncObsLbl: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.muted,
    marginBottom: 2,
  },
  ncObsTxt: {
    fontSize: 10,
    color: '#374151',
  },
  photosContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  photosLbl: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 5,
  },
  photosRow: {
    flexDirection: 'row',
  },
  photo: {
    width: 163,
    height: 122,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'solid',
    marginRight: 5,
    objectFit: 'cover',
  },
  apBox: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderStyle: 'solid',
    borderRadius: 4,
  },
  apLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    marginBottom: 6,
  },
  apRow: {
    flexDirection: 'row',
  },
  apItem: {
    flex: 1,
  },
  apItemLbl: {
    fontSize: 8,
    color: C.muted,
    marginBottom: 2,
  },
  apItemVal: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },

  // ── Checklist ──
  clSection: {
    paddingTop: 18,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  clTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    marginBottom: 12,
  },
  nrGroup: {
    marginBottom: 16,
  },
  nrGroupHead: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nrAccent: {
    width: 3,
    height: 14,
    backgroundColor: C.yellow,
    borderRadius: 2,
    marginRight: 8,
  },
  nrGroupName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
  },
  nrItemsBorder: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: C.border,
    borderStyle: 'solid',
  },
  clItemEven: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    borderBottomStyle: 'solid',
  },
  clItemOdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    borderBottomStyle: 'solid',
  },
  statusCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  statusCircleText: {
    color: C.white,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  clItemTextCol: {
    flex: 1,
  },
  clItemText: {
    fontSize: 9,
    color: '#374151',
  },
  clItemObs: {
    fontSize: 8,
    color: C.muted,
    marginTop: 1,
  },
  clStatus: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    width: 28,
    textAlign: 'right',
  },

  // ── Assinatura (flui no fim do conteúdo) ──
  signatureSection: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderTopWidth: 2,
    borderTopColor: C.border,
    borderTopStyle: 'solid',
    backgroundColor: C.bg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sigLine: {
    width: 160,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    borderBottomStyle: 'solid',
    marginBottom: 5,
  },
  sigName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.text,
  },
  sigRole: {
    fontSize: 9,
    color: C.muted,
    marginTop: 2,
  },
  sigRight: {
    alignItems: 'flex-end',
  },
  sigDate: {
    fontSize: 8,
    color: C.gray,
    marginBottom: 2,
  },
  sigBrand: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  sigUrl: {
    fontSize: 8,
    color: C.gray,
  },

  // ── Rodapé fixo (todas as páginas) ──
  pageFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  pageFooterBrand: {
    fontSize: 7,
    color: '#9ca3af',
  },
  pageFooterPage: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
});

// ── Component ──
export default function InspectionPDFDocument({
  inspectionId,
  inspData,
  selectedNRs,
  nonConformities,
  responses,
  companyLogo,
  okCount,
  ncCount,
  naCount,
  totalAnswered,
  conformityScore,
}: InspectionPDFProps) {
  const idStr = inspectionId.toString().padStart(4, '0');

  return (
    <Document
      title={`Inspeção SST #${idStr}`}
      author={inspData?.inspectorName || 'SST Check Pro'}
      creator="SST Check Pro"
    >
      <Page size="A4" style={s.page}>

        {/* ── Mini-cabeçalho fixo nas páginas 2+ ── */}
        <View
          fixed
          render={({ pageNumber }) =>
            pageNumber > 1 ? (
              <View style={s.miniHeader}>
                <Text style={s.miniHeaderBrand}>SST Check Pro | sstcheckpro.com.br</Text>
                <Text style={s.miniHeaderInspection}>
                  Inspecao #{idStr}{inspData?.title ? ` - ${inspData.title}` : ''}
                </Text>
              </View>
            ) : null
          }
        />

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {companyLogo ? (
              <>
                <View style={s.companyLogoBox}>
                  <Image src={companyLogo} style={s.companyLogoImg} />
                </View>
                <View>
                  <Text style={s.brandSmall}>Relatório de Inspeção</Text>
                  <Text style={s.brandSmallSub}>Segurança do Trabalho</Text>
                </View>
              </>
            ) : (
              <>
                <View style={s.logoBox}>
                  <Svg width={28} height={28} viewBox="0 0 24 24">
                    <Path
                      d="M4 13 L9 18 L20 7"
                      stroke="#1a1d23"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                </View>
                <View style={s.brandBlock}>
                  {/* SST em branco, Check em amarelo, Pro em branco */}
                  <Text style={s.brandRow}>
                    <Text style={{ color: C.white }}>SST</Text>
                    <Text style={{ color: C.yellow }}>Check</Text>
                    <Text style={{ color: C.white }}>Pro</Text>
                  </Text>
                  <Text style={s.brandSub}>
                    Relatório de Inspeção de Segurança do Trabalho
                  </Text>
                </View>
              </>
            )}
          </View>
          <View style={s.headerRight}>
            <Text style={s.inspLabel}>INSPEÇÃO N.</Text>
            <Text style={s.inspNumber}>#{idStr}</Text>
            {companyLogo && <Text style={s.viaLabel}>via SSTCheckPro</Text>}
          </View>
        </View>

        {/* ── NRs Bar ── */}
        <View style={s.nrBar}>
          <Text style={s.nrBarLabel}>NRS INSPECIONADAS:</Text>
          {selectedNRs.map((nr) => (
            <View key={nr.id} style={s.nrTag}>
              <Text style={s.nrTagText}>{nr.nrNumber}</Text>
            </View>
          ))}
        </View>

        {/* ── Info Section ── */}
        <View style={s.infoSection}>
          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>OBRA / LOCAL</Text>
              <Text style={s.infoValue}>{inspData?.title || 'Não informado'}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>DATA DA INSPEÇÃO</Text>
              <Text style={s.infoValue}>
                {formatDate(inspData?.completedAt || inspData?.createdAt)}
              </Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>INSPETOR RESPONSÁVEL</Text>
              <Text style={s.infoValue}>{inspData?.inspectorName || 'Não informado'}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>LOCALIZAÇÃO</Text>
              <Text style={s.infoValue}>{inspData?.location || 'Não informado'}</Text>
            </View>
          </View>
          {inspData?.observations && (
            <View style={s.obsBox}>
              <Text style={s.obsLabel}>OBSERVAÇÕES GERAIS</Text>
              <Text style={s.obsText}>{inspData.observations}</Text>
            </View>
          )}
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          {[
            {
              val: String(totalAnswered),
              lbl: 'TOTAL ITENS',
              bg: C.white,
              border: C.border,
              valColor: C.text,
              lblColor: C.muted,
            },
            {
              val: String(okCount),
              lbl: 'CONFORME',
              bg: '#dcfce7',
              border: '#bbf7d0',
              valColor: '#16a34a',
              lblColor: '#15803d',
            },
            {
              val: String(ncCount),
              lbl: 'NÃO CONFORME',
              bg: '#fef2f2',
              border: '#fecaca',
              valColor: C.red,
              lblColor: '#b91c1c',
            },
            {
              val: `${conformityScore}%`,
              lbl: 'SCORE',
              bg: C.dark,
              border: C.dark,
              valColor: C.yellow,
              lblColor: 'rgba(255,255,255,0.8)',
            },
          ].map((stat, i) => (
            <View
              key={i}
              style={[s.statBox, { backgroundColor: stat.bg, borderColor: stat.border }]}
            >
              <Text style={[s.statVal, { color: stat.valColor }]}>{stat.val}</Text>
              <Text style={[s.statLbl, { color: stat.lblColor }]}>{stat.lbl}</Text>
            </View>
          ))}
        </View>

        {/* ── Não Conformidades ── */}
        {nonConformities.length > 0 && (
          <View style={s.ncSection}>
            {/* Banner com ícone de alerta */}
            <View style={s.ncBanner}>
              <View style={s.ncBannerIcon}>
                <Text style={s.ncBannerIconText}>!</Text>
              </View>
              <Text style={s.ncBannerText}>
                NÃO CONFORMIDADES IDENTIFICADAS ({ncCount})
              </Text>
            </View>

            {nonConformities.map(({ nrNumber, nrName, item, data }, idx) => (
              <View key={item.id} style={s.ncCard} wrap={false}>
                <View style={s.ncCardHead}>
                  <View style={s.ncBadge}>
                    <Text style={s.ncBadgeText}>{idx + 1}</Text>
                  </View>
                  <View style={s.ncCardBody}>
                    <Text style={s.ncCardTitle}>{item.text}</Text>
                    <Text style={s.ncCardNR}>{nrNumber} | {nrName}</Text>
                  </View>
                </View>

                {data.observation ? (
                  <View style={s.ncObsBox}>
                    <Text style={s.ncObsLbl}>OBSERVAÇÃO</Text>
                    <Text style={s.ncObsTxt}>{data.observation}</Text>
                  </View>
                ) : null}

                {data.photos && data.photos.length > 0 && (
                  <View style={s.photosContainer}>
                    <Text style={s.photosLbl}>
                      EVIDÊNCIAS FOTOGRÁFICAS ({data.photos.length})
                    </Text>
                    <View style={s.photosRow}>
                      {data.photos.slice(0, 3).map((photo, pi) => (
                        <Image key={pi} src={photo} style={s.photo} />
                      ))}
                    </View>
                  </View>
                )}

                {data.actionPlan &&
                  (data.actionPlan.responsible ||
                    data.actionPlan.deadline ||
                    data.actionPlan.priority) && (
                    <View style={s.apBox}>
                      <Text style={s.apLabel}>PLANO DE AÇÃO</Text>
                      <View style={s.apRow}>
                        <View style={s.apItem}>
                          <Text style={s.apItemLbl}>Responsável</Text>
                          <Text style={s.apItemVal}>
                            {data.actionPlan.responsible || '-'}
                          </Text>
                        </View>
                        <View style={s.apItem}>
                          <Text style={s.apItemLbl}>Prazo</Text>
                          <Text style={s.apItemVal}>
                            {data.actionPlan.deadline
                              ? formatDateShort(data.actionPlan.deadline)
                              : '-'}
                          </Text>
                        </View>
                        <View style={s.apItem}>
                          <Text style={s.apItemLbl}>Prioridade</Text>
                          <Text
                            style={[
                              s.apItemVal,
                              { color: getPriority(data.actionPlan.priority).color },
                            ]}
                          >
                            {getPriority(data.actionPlan.priority).text}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
              </View>
            ))}
          </View>
        )}

        {/* ── Checklist Completo ── */}
        <View style={s.clSection}>
          <Text style={s.clTitle}>CHECKLIST COMPLETO</Text>

          {selectedNRs.map((nr) => (
            <View key={nr.id} style={s.nrGroup}>
              {/* Header + primeiro item juntos para evitar header órfão */}
              <View wrap={false}>
                <View style={s.nrGroupHead}>
                  <View style={s.nrAccent} />
                  <Text style={s.nrGroupName}>
                    {nr.nrNumber} | {nr.nrName}
                  </Text>
                </View>
                <View style={s.nrItemsBorder}>
                  {nr.items.slice(0, 1).map((item, idx) => {
                    const r = responses[item.id];
                    const status = r?.response;
                    return (
                      <ChecklistItem
                        key={item.id}
                        item={item}
                        idx={idx}
                        status={status}
                        observation={r?.observation}
                      />
                    );
                  })}
                </View>
              </View>

              {/* Demais itens */}
              <View style={s.nrItemsBorder}>
                {nr.items.slice(1).map((item, idx) => {
                  const r = responses[item.id];
                  const status = r?.response;
                  return (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      idx={idx + 1}
                      status={status}
                      observation={r?.observation}
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* ── Assinatura (fim do documento) ── */}
        <View style={s.signatureSection}>
          <View>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{inspData?.inspectorName || 'Responsável'}</Text>
            <Text style={s.sigRole}>Técnico / Engenheiro de Segurança do Trabalho</Text>
          </View>
          <View style={s.sigRight}>
            <Text style={s.sigDate}>Gerado em {formatDate(new Date().toISOString())}</Text>
            <Text style={s.sigBrand}>SST Check Pro</Text>
            <Text style={s.sigUrl}>sstcheckpro.com.br</Text>
          </View>
        </View>

        {/* ── Rodapé fixo em todas as páginas ── */}
        <View style={s.pageFooter} fixed>
          <Text style={s.pageFooterBrand}>SST Check Pro | sstcheckpro.com.br</Text>
          <Text
            style={s.pageFooterPage}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}

// ── Sub-componente item do checklist ──
function ChecklistItem({
  item,
  idx,
  status,
  observation,
}: {
  item: { id: string; text: string };
  idx: number;
  status: 'ok' | 'nc' | 'na' | null | undefined;
  observation?: string;
}) {
  const dotColor =
    status === 'ok'
      ? C.green
      : status === 'nc'
      ? C.red
      : status === 'na'
      ? C.gray
      : '#e5e7eb';
  const dotSymbol =
    status === 'ok' ? 'C' : status === 'nc' ? 'X' : status === 'na' ? '-' : '';
  const statusText =
    status === 'ok' ? 'CONF' : status === 'nc' ? 'NC' : status === 'na' ? 'N/A' : '-';
  const statusColor =
    status === 'ok' ? C.green : status === 'nc' ? C.red : C.muted;

  return (
    <View style={idx % 2 === 0 ? s.clItemEven : s.clItemOdd} wrap={false}>
      <View style={[s.statusCircle, { backgroundColor: dotColor }]}>
        <Text style={s.statusCircleText}>{dotSymbol}</Text>
      </View>
      <View style={s.clItemTextCol}>
        <Text style={s.clItemText}>
          {idx + 1}. {item.text}
        </Text>
        {observation ? <Text style={s.clItemObs}>{observation}</Text> : null}
      </View>
      <Text style={[s.clStatus, { color: statusColor }]}>{statusText}</Text>
    </View>
  );
}
