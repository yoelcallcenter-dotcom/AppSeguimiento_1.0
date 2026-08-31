import React, { useMemo } from 'react';
import {
  X, Building2, Scale, FileText, Users, AlertTriangle, Shield,
  ShieldAlert, MessageSquare, Plus, ExternalLink, MapPin, TrendingUp,
} from 'lucide-react';
import {
  getInsurerSummary, getLawFirmSummary, getCasesForInsurer, getCasesForLawFirm,
  getCondicionalesForInsurer, getCondicionalesForLawFirm,
  getRelatedSpeechs, getRelatedObjeciones, getInsurerStats, getLawFirmStats,
} from '../../core/entities/entityRelations';

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'condicionales', label: 'Condicionales' },
  { key: 'herramientas', label: 'Herramientas' },
  { key: 'casos', label: 'Casos' },
];

export default function EntityPanel({
  isOpen,
  onClose,
  type,
  name,
  cases = [],
  condicionales = [],
  mapeo = [],
  aseguradoras = [],
  speechs = [],
  objeciones = [],
  config = {},
  onVerCaso,
  onNavigateToUtiles,
  onCrearCaso,
}) {
  const [activeTab, setActiveTab] = React.useState('resumen');

  const summary = useMemo(() => {
    if (!name) return null;
    if (type === 'insurer') return getInsurerSummary(name, cases, condicionales, aseguradoras);
    return getLawFirmSummary(name, cases, condicionales, mapeo);
  }, [type, name, cases, condicionales, mapeo, aseguradoras]);

  const stats = useMemo(() => {
    if (!name) return null;
    if (type === 'insurer') return getInsurerStats(name, cases, config);
    return getLawFirmStats(name, cases, config);
  }, [type, name, cases, config]);

  const entityCases = useMemo(() => {
    if (!name) return [];
    if (type === 'insurer') return getCasesForInsurer(name, cases);
    return getCasesForLawFirm(name, cases);
  }, [type, name, cases]);

  const entityCondicionales = useMemo(() => {
    if (!name) return [];
    if (type === 'insurer') return getCondicionalesForInsurer(name, condicionales);
    return getCondicionalesForLawFirm(name, condicionales);
  }, [type, name, condicionales]);

  const entitySpeechs = useMemo(() => getRelatedSpeechs(name, speechs), [name, speechs]);
  const entityObjeciones = useMemo(() => getRelatedObjeciones(name, objeciones), [name, objeciones]);

  if (!isOpen || !name) return null;

  const isInsurer = type === 'insurer';
  const Icon = isInsurer ? Building2 : Scale;
  const iconColor = isInsurer ? 'var(--color-accent)' : 'var(--color-success)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl my-6 animate-scale-in max-h-[85vh] flex flex-col"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px var(--color-shadow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: iconColor + '22' }}>
              <Icon size={18} style={{ color: iconColor }} />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{name}</div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {isInsurer ? 'Aseguradora' : 'Estudio Jurídico'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70 transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5" style={{ borderColor: 'var(--color-border)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-3 py-2 text-xs font-medium transition-colors"
              style={{
                color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === 'resumen' && (
            <ResumenTab
              summary={summary}
              stats={stats}
              type={type}
              onCrearCaso={onCrearCaso}
              onNavigateToUtiles={onNavigateToUtiles}
            />
          )}
          {activeTab === 'condicionales' && (
            <CondicionalesTab condicionales={entityCondicionales} onNavigateToUtiles={onNavigateToUtiles} />
          )}
          {activeTab === 'herramientas' && (
            <HerramientasTab speechs={entitySpeechs} objeciones={entityObjeciones} onNavigateToUtiles={onNavigateToUtiles} />
          )}
          {activeTab === 'casos' && (
            <CasosTab casos={entityCases} onVerCaso={onVerCaso} />
          )}
        </div>
      </div>
    </div>
  );
}

function ResumenTab({ summary, stats, type, onCrearCaso, onNavigateToUtiles }) {
  if (!summary || !stats) return null;
  const isInsurer = type === 'insurer';

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total casos" value={stats.total} icon={Users} />
        <StatCard label="Activos" value={stats.activos} icon={FileText} color="var(--color-warning)" />
        <StatCard label="Firmas" value={stats.firmas} icon={TrendingUp} color="var(--color-success)" />
        <StatCard label="Conversión" value={`${stats.tasaConversion}%`} icon={TrendingUp} color="var(--color-accent)" />
      </div>

      {/* Info del directorio */}
      {isInsurer && summary.existeEnDirectorio && summary.observaciones && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface2)' }}>
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Observaciones</div>
          <div className="text-xs" style={{ color: 'var(--color-text)' }}>{summary.observaciones}</div>
        </div>
      )}

      {!isInsurer && summary.existeEnMapeo && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface2)' }}>
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Ubicación</div>
          <div className="space-y-1 text-xs" style={{ color: 'var(--color-text)' }}>
            {summary.provincia && <div className="flex items-center gap-1"><MapPin size={11} /> {summary.provincia}</div>}
            {summary.localidades && <div>{summary.localidades}</div>}
            {summary.direcciones?.length > 0 && (
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {summary.direcciones.length} dirección(es)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Condicionales resumen */}
      {summary.condicionalesCount > 0 && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface2)' }}>
          <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>Condicionales</div>
          <div className="flex gap-2 text-xs">
            {summary.noTomanCount > 0 && (
              <span className="flex items-center gap-1" style={{ color: 'var(--color-danger)' }}>
                <ShieldAlert size={11} /> {summary.noTomanCount} no toma
              </span>
            )}
            {summary.condicionCount > 0 && (
              <span className="flex items-center gap-1" style={{ color: 'var(--color-warning)' }}>
                <Shield size={11} /> {summary.condicionCount} condicionales
              </span>
            )}
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="flex gap-2">
        <button
          onClick={() => onCrearCaso && onCrearCaso(type, name)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          <Plus size={12} /> Crear caso
        </button>
        <button
          onClick={() => onNavigateToUtiles && onNavigateToUtiles()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        >
          <ExternalLink size={12} /> Ver condicionales
        </button>
      </div>
    </div>
  );
}

function CondicionalesTab({ condicionales, onNavigateToUtiles }) {
  if (condicionales.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield size={24} style={{ color: 'var(--color-text-muted)', margin: '0 auto' }} />
        <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Sin condicionales registrados</div>
      </div>
    );
  }

  const noToman = condicionales.filter((c) => c.condicion === 'no-toma');
  const conCondicion = condicionales.filter((c) => c.condicion === 'condicion');

  return (
    <div className="space-y-3">
      {noToman.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--color-danger)' }}>
            <ShieldAlert size={11} /> No toman ({noToman.length})
          </div>
          {noToman.map((c) => (
            <CondicionRow key={c.id} condicional={c} />
          ))}
        </div>
      )}
      {conCondicion.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--color-warning)' }}>
            <Shield size={11} /> Condiciones ({conCondicion.length})
          </div>
          {conCondicion.map((c) => (
            <CondicionRow key={c.id} condicional={c} />
          ))}
        </div>
      )}
      <button
        onClick={() => onNavigateToUtiles && onNavigateToUtiles('condicionales')}
        className="text-[11px] font-medium hover:opacity-70 transition-opacity"
        style={{ color: 'var(--color-accent)' }}
      >
        Ver todos en Útiles →
      </button>
    </div>
  );
}

function CondicionRow({ condicional }) {
  const isNoToma = condicional.condicion === 'no-toma';
  return (
    <div
      className="flex items-start gap-2 p-2 rounded mb-1"
      style={{ backgroundColor: 'var(--color-surface2)' }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
        style={{ backgroundColor: isNoToma ? 'var(--color-danger)' : 'var(--color-warning)' }}
      />
      <div className="min-w-0">
        <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
          {isNoToma ? 'No toma' : 'Condicional'}: {condicional.aseguradora}
        </div>
        {condicional.observacion && (
          <div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
            {condicional.observacion}
          </div>
        )}
      </div>
    </div>
  );
}

function HerramientasTab({ speechs, objeciones, onNavigateToUtiles }) {
  const hasContent = speechs.length > 0 || objeciones.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-8">
        <MessageSquare size={24} style={{ color: 'var(--color-text-muted)', margin: '0 auto' }} />
        <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Sin herramientas relacionadas</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {speechs.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--color-accent)' }}>
            <MessageSquare size={11} /> Speechs ({speechs.length})
          </div>
          {speechs.slice(0, 5).map((s, i) => (
            <div key={i} className="p-2 rounded mb-1 text-xs" style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)' }}>
              {typeof s === 'string' ? s.slice(0, 100) : (s.contenido || s.texto || '').slice(0, 100)}
            </div>
          ))}
        </div>
      )}
      {objeciones.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--color-warning)' }}>
            <AlertTriangle size={11} /> Objeciones ({objeciones.length})
          </div>
          {objeciones.slice(0, 5).map((o, i) => (
            <div key={i} className="p-2 rounded mb-1 text-xs" style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)' }}>
              {o.titulo && <div className="font-medium">{o.titulo}</div>}
              <div className="truncate">{(o.contenido || o.texto || '').slice(0, 100)}</div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => onNavigateToUtiles && onNavigateToUtiles()}
        className="text-[11px] font-medium hover:opacity-70 transition-opacity"
        style={{ color: 'var(--color-accent)' }}
      >
        Ver todas en Útiles →
      </button>
    </div>
  );
}

function CasosTab({ casos, onVerCaso }) {
  if (casos.length === 0) {
    return (
      <div className="text-center py-8">
        <Users size={24} style={{ color: 'var(--color-text-muted)', margin: '0 auto' }} />
        <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Sin casos relacionados</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {casos.slice(0, 10).map((c) => (
        <button
          key={c.id}
          onClick={() => onVerCaso && onVerCaso(c)}
          className="w-full flex items-center gap-2 p-2 rounded text-left hover:opacity-70 transition-opacity"
          style={{ backgroundColor: 'var(--color-surface2)' }}
        >
          <FileText size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{c.nombre || 'Sin nombre'}</div>
            <div className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{c.estado || '—'} · {c.fecha || '—'}</div>
          </div>
        </button>
      ))}
      {casos.length > 10 && (
        <div className="text-[11px] text-center pt-1" style={{ color: 'var(--color-text-muted)' }}>
          +{casos.length - 10} casos más
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface2)' }}>
      <div className="flex items-center gap-1 text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>
        {Icon && <Icon size={10} />}
        {label}
      </div>
      <div className="text-sm font-bold" style={{ color: color || 'var(--color-text)' }}>{value}</div>
    </div>
  );
}
