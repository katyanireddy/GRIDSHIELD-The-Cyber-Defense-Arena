import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Sliders, 
  RotateCw, 
  Terminal, 
  Radio, 
  Lock, 
  Unlock, 
  Server, 
  Thermometer, 
  ArrowUpRight 
} from 'lucide-react';
import { GridNode, GridConnection, NodeStatus } from '../../types/grid';
import { useSound } from '../../hooks/useSound';

interface DigitalTwinScreenProps {
  nodes: GridNode[];
  connections: GridConnection[];
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onIsolateNode: (id: string) => void;
  onRestoreNode: (id: string) => void;
  onPatchNode: (id: string) => void;
}

export const DigitalTwinScreen: React.FC<DigitalTwinScreenProps> = ({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  onIsolateNode,
  onRestoreNode,
  onPatchNode,
}) => {
  const { playClick, playNodeSelect, playAlert, playIsolate, playSuccess, playHover, playRadarPing } = useSound();
  const [filterType, setFilterType] = useState<string>('all');
  const [radarAngle, setRadarAngle] = useState(0);
  const [radarActive, setRadarActive] = useState(true);

  // Animate radar sweep angle
  useEffect(() => {
    if (!radarActive) return;
    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 1.2) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [radarActive]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const filteredNodes = nodes.filter((n) => {
    if (filterType === 'all') return true;
    if (filterType === 'alerts') return n.status === 'alert' || n.status === 'warning';
    if (filterType === 'substations') return n.type === 'substation';
    if (filterType === 'generation') return n.type === 'generation' || n.type === 'renewable' || n.type === 'storage';
    return true;
  });

  const getStatusBadge = (status: NodeStatus) => {
    switch (status) {
      case 'nominal':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-command font-bold uppercase tracking-wider bg-[rgba(53,230,161,0.1)] text-[#35E6A1] border border-[rgba(53,230,161,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#35E6A1] animate-pulse"></span>
            NOMINAL
          </span>
        );
      case 'alert':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-command font-bold uppercase tracking-wider bg-[rgba(255,64,93,0.15)] text-[#FF405D] border border-[rgba(255,64,93,0.4)] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF405D]"></span>
            COMPROMISED
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-command font-bold uppercase tracking-wider bg-[rgba(244,201,93,0.12)] text-[#F4C95D] border border-[rgba(244,201,93,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F4C95D]"></span>
            WARNING
          </span>
        );
      case 'isolated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-command font-bold uppercase tracking-wider bg-[#31353f] text-[#c0c7d4] border border-[#404752]">
            <Lock className="w-2.5 h-2.5" />
            AIR-GAPPED
          </span>
        );
    }
  };

  return (
    <div className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[calc(100vh-80px)]">
      {/* LEFT SIDEBAR: Telemetry Feeds & Substation Roster (3 cols) */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Roster Header Panel */}
        <div className="hud-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-command font-bold uppercase tracking-widest text-[#48A5FF]">
                GRID TOPOLOGY
              </span>
              <h2 className="text-sm font-command font-bold text-[#dfe2f0]">SUBSTATION MATRIX</h2>
            </div>
            <span className="text-[10px] font-mono-code text-[#8a919d]">NODE COUNT: {nodes.length}</span>
          </div>

          {/* Filter Pills */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#0D1422] rounded border border-[rgba(72,165,255,0.1)] text-[10px] font-command font-semibold mb-3">
            {[
              { id: 'all', label: 'ALL' },
              { id: 'alerts', label: 'ALERTS' },
              { id: 'substations', label: 'HUBS' },
              { id: 'generation', label: 'GEN' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  playClick();
                  setFilterType(f.id);
                }}
                onMouseEnter={playHover}
                className={`py-1 rounded text-center transition-all ${
                  filterType === f.id
                    ? 'bg-[#18263D] text-[#48A5FF] border border-[#48A5FF]/30'
                    : 'text-[#8a919d] hover:text-[#dfe2f0]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Node Cards list */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              return (
                <div
                  key={node.id}
                  onClick={() => {
                    playNodeSelect();
                    onSelectNode(node.id);
                  }}
                  onMouseEnter={playHover}
                  className={`p-3 rounded border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[#18263D] border-[#48A5FF] shadow-[0_0_14px_rgba(72,165,255,0.25)]'
                      : node.status === 'alert'
                      ? 'bg-[#111C2D] border-[rgba(255,64,93,0.5)] hover:border-[#FF405D]'
                      : 'bg-[#111C2D]/80 border-[rgba(72,165,255,0.12)] hover:border-[rgba(72,165,255,0.35)] hover:bg-[#111C2D]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-command font-bold text-xs text-[#dfe2f0] group-hover:text-[#48A5FF] transition-colors">
                      {node.name}
                    </span>
                    {getStatusBadge(node.status)}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-code text-[#c0c7d4]/80">
                    <span>{node.voltageKv} kV</span>
                    <span className={node.frequencyHz < 59.95 ? 'text-[#FF405D] font-bold' : 'text-[#35E6A1]'}>
                      {node.frequencyHz.toFixed(2)} Hz
                    </span>
                    <span>
                      {node.activePowerMw} / {node.maxPowerMw} MW
                    </span>
                  </div>

                  {/* Power Bar */}
                  <div className="mt-2 w-full h-1.5 bg-[#0D1422] rounded-full overflow-hidden border border-[rgba(72,165,255,0.1)]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        node.status === 'alert'
                          ? 'bg-[#FF405D]'
                          : node.status === 'warning'
                          ? 'bg-[#F4C95D]'
                          : 'bg-[#48A5FF]'
                      }`}
                      style={{ width: `${Math.min(100, (node.activePowerMw / node.maxPowerMw) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Tactical Controls */}
        <div className="hud-card p-4">
          <span className="text-[10px] font-command font-bold uppercase tracking-widest text-[#48A5FF]">
            GLOBAL DEFENSIVE ACTIONS
          </span>
          <div className="mt-2 space-y-2">
            <button
              onClick={() => {
                playRadarPing();
              }}
              onMouseEnter={playHover}
              className="w-full py-2 px-3 rounded bg-[#0D1422] hover:bg-[#18263D] border border-[rgba(72,165,255,0.25)] hover:border-[#48A5FF] text-xs font-command font-bold text-[#48A5FF] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#48A5FF]" />
                <span>PULSE SCADA RADAR SWEEP</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                playSuccess();
                nodes.forEach((n) => {
                  if (n.status === 'warning') onPatchNode(n.id);
                });
              }}
              onMouseEnter={playHover}
              className="w-full py-2 px-3 rounded bg-[rgba(53,230,161,0.08)] hover:bg-[rgba(53,230,161,0.18)] border border-[rgba(53,230,161,0.3)] text-xs font-command font-bold text-[#35E6A1] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AUTO-PATCH SYNCHRO DRIFT</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CENTER VIEWPORT: Tactical Microgrid Digital Twin Map (6 cols) */}
      <div className="lg:col-span-6 flex flex-col gap-4">
        <div className="hud-card p-4 flex-1 flex flex-col relative overflow-hidden bg-[#070B14]">
          {/* Top Viewport Header */}
          <div className="flex items-center justify-between z-10 mb-2 border-b border-[rgba(72,165,255,0.1)] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#48A5FF] animate-ping"></span>
              <span className="font-command font-bold text-xs uppercase tracking-widest text-[#48A5FF]">
                DIGITAL TWIN TOPOLOGY // 2D TACTICAL RETICLE
              </span>
            </div>
            <div className="text-[11px] font-mono-code text-[#c0c7d4]/80 flex items-center gap-4">
              <span>COORD: [ 42°21&apos;N 71°03&apos;W ]</span>
              <button
                onClick={() => setRadarActive(!radarActive)}
                className="px-2 py-0.5 rounded text-[10px] font-command bg-[#111C2D] border border-[rgba(72,165,255,0.2)] text-[#dfe2f0] hover:text-[#48A5FF]"
              >
                RADAR: {radarActive ? 'ACTIVE' : 'PAUSED'}
              </button>
            </div>
          </div>

          {/* The Visual Microgrid Viewport Canvas / SVG Container */}
          <div className="relative flex-1 min-h-[440px] w-full rounded bg-tactical-grid bg-[#070B14] border border-[rgba(72,165,255,0.12)] overflow-hidden flex items-center justify-center select-none">
            {/* Ambient Crosshair Grid Background */}
            <div className="absolute inset-0 bg-tactical-dots opacity-40 pointer-events-none"></div>

            {/* Radar Sweep Reticle */}
            {radarActive && (
              <div 
                className="absolute w-[440px] h-[440px] rounded-full pointer-events-none opacity-40"
                style={{
                  background: `conic-gradient(from ${radarAngle}deg, transparent 70%, rgba(72, 165, 255, 0.25) 100%)`,
                }}
              ></div>
            )}

            {/* Radar Concentric Rings */}
            <div className="absolute w-[420px] h-[420px] rounded-full border border-[rgba(72,165,255,0.1)] pointer-events-none"></div>
            <div className="absolute w-[280px] h-[280px] rounded-full border border-[rgba(72,165,255,0.12)] pointer-events-none"></div>
            <div className="absolute w-[140px] h-[140px] rounded-full border border-[rgba(72,165,255,0.15)] pointer-events-none"></div>

            {/* Crosshair Center Axes */}
            <div className="absolute w-full h-[1px] bg-[rgba(72,165,255,0.08)] pointer-events-none"></div>
            <div className="absolute h-full w-[1px] bg-[rgba(72,165,255,0.08)] pointer-events-none"></div>

            {/* SVG Connecting Bus Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connections.map((conn, idx) => {
                const source = nodes.find((n) => n.id === conn.fromId);
                const target = nodes.find((n) => n.id === conn.toId);
                if (!source || !target) return null;

                const isDegraded = conn.status === 'degraded' || source.status === 'alert' || target.status === 'alert';
                const isSevered = source.status === 'isolated' || target.status === 'isolated';

                return (
                  <g key={`${conn.fromId}-${conn.toId}-${idx}`}>
                    {/* Shadow / Glow line */}
                    <line
                      x1={`${source.x}%`}
                      y1={`${source.y}%`}
                      x2={`${target.x}%`}
                      y2={`${target.y}%`}
                      stroke={isSevered ? '#404752' : isDegraded ? '#FF405D' : '#48A5FF'}
                      strokeWidth={isSevered ? 1 : 2.5}
                      strokeOpacity={isSevered ? 0.3 : 0.4}
                      strokeDasharray={isSevered ? '4 4' : undefined}
                    />

                    {/* Animated moving pulse dash */}
                    {!isSevered && (
                      <line
                        x1={`${source.x}%`}
                        y1={`${source.y}%`}
                        x2={`${target.x}%`}
                        y2={`${target.y}%`}
                        stroke={isDegraded ? '#FF405D' : '#35E6A1'}
                        strokeWidth={1.5}
                        strokeDasharray="6 12"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Interactive Grid Nodes on Map */}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isAlert = node.status === 'alert';
              const isWarning = node.status === 'warning';
              const isIsolated = node.status === 'isolated';

              return (
                <div
                  key={node.id}
                  onClick={() => {
                    playNodeSelect();
                    onSelectNode(node.id);
                  }}
                  onMouseEnter={playHover}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute cursor-pointer group z-20"
                >
                  {/* Outer pulsating alert ring if compromised */}
                  {isAlert && (
                    <div className="absolute -inset-4 rounded-full border border-[#FF405D] animate-ping opacity-60 pointer-events-none"></div>
                  )}

                  {/* Node icon disc */}
                  <div
                    className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-200 border-2 relative ${
                      isSelected
                        ? 'bg-[#18263D] border-[#48A5FF] shadow-[0_0_20px_rgba(72,165,255,0.8)] scale-110'
                        : isAlert
                        ? 'bg-[rgba(255,64,93,0.2)] border-[#FF405D] shadow-[0_0_16px_rgba(255,64,93,0.6)]'
                        : isWarning
                        ? 'bg-[rgba(244,201,93,0.15)] border-[#F4C95D]'
                        : isIsolated
                        ? 'bg-[#171c25] border-[#404752]'
                        : 'bg-[#0D1422] border-[#48A5FF]/50 hover:border-[#48A5FF] hover:scale-105'
                    }`}
                  >
                    {isAlert ? (
                      <AlertTriangle className="w-5 h-5 text-[#FF405D] animate-pulse" />
                    ) : isIsolated ? (
                      <Lock className="w-5 h-5 text-[#8a919d]" />
                    ) : (
                      <Zap className={`w-5 h-5 ${isSelected ? 'text-[#48A5FF]' : 'text-[#35E6A1]'}`} />
                    )}

                    {/* Central 6px indicator point as per design document */}
                    <span
                      className={`absolute -bottom-1 w-2 h-2 rounded-full border border-[#070B14] ${
                        isAlert
                          ? 'bg-[#FF405D]'
                          : isWarning
                          ? 'bg-[#F4C95D]'
                          : isIsolated
                          ? 'bg-[#8a919d]'
                          : 'bg-[#35E6A1]'
                      }`}
                    ></span>
                  </div>

                  {/* Tactical Label Badge */}
                  <div
                    className={`mt-1.5 px-2 py-0.5 rounded text-[10px] font-command font-bold whitespace-nowrap tracking-wider text-center border backdrop-blur-sm ${
                      isSelected
                        ? 'bg-[#18263D] text-[#48A5FF] border-[#48A5FF]'
                        : isAlert
                        ? 'bg-[#FF405D]/20 text-[#FF405D] border-[#FF405D]'
                        : 'bg-[#111C2D]/90 text-[#dfe2f0] border-[rgba(72,165,255,0.2)] group-hover:border-[#48A5FF]'
                    }`}
                  >
                    <span>{(node.code ?? node.id ?? 'UNKNOWN').split('//')[0].trim()}</span>
                    <span className="block text-[8px] font-mono-code text-[#c0c7d4]/80">
                      {node.activePowerMw} MW
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Telemetry Ticker on map */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono-code text-[#c0c7d4]">
            <div className="p-2 bg-[#0D1422] rounded border border-[rgba(72,165,255,0.1)]">
              <span className="text-[#8a919d] text-[10px] block">TOTAL GENERATION</span>
              <span className="text-[#35E6A1] font-bold text-sm">104.0 MW</span>
            </div>
            <div className="p-2 bg-[#0D1422] rounded border border-[rgba(72,165,255,0.1)]">
              <span className="text-[#8a919d] text-[10px] block">DEMAND CONSUMPTION</span>
              <span className="text-[#48A5FF] font-bold text-sm">84.5 MW</span>
            </div>
            <div className="p-2 bg-[#0D1422] rounded border border-[rgba(72,165,255,0.1)]">
              <span className="text-[#8a919d] text-[10px] block">RESERVE MARGIN</span>
              <span className="text-[#dfe2f0] font-bold text-sm">+23.1%</span>
            </div>
            <div className="p-2 bg-[#0D1422] rounded border border-[rgba(72,165,255,0.1)]">
              <span className="text-[#8a919d] text-[10px] block">SYNCHRONOUS INERTIA</span>
              <span className="text-[#35E6A1] font-bold text-sm">4.82 GW·s</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: Telemetry Inspector & Deep SCADA Diagnostics (3 cols) */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Deep Node Inspector Panel */}
        <div className={`hud-card p-4 ${selectedNode.status === 'alert' ? 'hud-card-alert' : ''}`}>
          <div className="flex items-center justify-between mb-3 border-b border-[rgba(72,165,255,0.1)] pb-2">
            <div>
              <span className="text-[10px] font-command font-bold uppercase tracking-widest text-[#48A5FF]">
                TELEMETRY INSPECTOR
              </span>
              <h3 className="font-command font-bold text-sm text-[#dfe2f0]">{selectedNode.name}</h3>
            </div>
            {getStatusBadge(selectedNode.status)}
          </div>

          <div className="space-y-3 text-xs">
            {/* SCADA specs */}
            <div className="grid grid-cols-2 gap-2 bg-[#0D1422] p-2.5 rounded border border-[rgba(72,165,255,0.1)] font-mono-code">
              <div>
                <span className="text-[10px] text-[#8a919d] block">VOLTAGE RATING</span>
                <span className="text-[#dfe2f0] font-bold">{selectedNode.voltageKv} kV</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8a919d] block">SCADA PROTOCOL</span>
                <span className="text-[#48A5FF] font-bold">{selectedNode.scadaProtocol}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8a919d] block">IP ADDRESS</span>
                <span className="text-[#dfe2f0] font-bold">{selectedNode.ipAddress}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8a919d] block">CORE TEMP</span>
                <span className={selectedNode.temperatureC > 70 ? 'text-[#FF405D] font-bold' : 'text-[#35E6A1] font-bold'}>
                  {selectedNode.temperatureC}°C
                </span>
              </div>
            </div>

            {/* Frequency Jitter Monitor Sparkline */}
            <div className="bg-[#0D1422] p-2.5 rounded border border-[rgba(72,165,255,0.1)]">
              <div className="flex items-center justify-between text-[11px] font-mono-code mb-1">
                <span className="text-[#8a919d]">FREQUENCY OSCILLATION</span>
                <span className={selectedNode.frequencyHz < 59.95 ? 'text-[#FF405D] font-bold' : 'text-[#35E6A1] font-bold'}>
                  {selectedNode.frequencyHz.toFixed(3)} Hz
                </span>
              </div>
              {/* Hairline frequency path */}
              <svg className="w-full h-8 stroke-current" viewBox="0 0 100 24">
                <path
                  d="M0 12 Q 10 4, 20 12 T 40 12 T 60 12 T 80 12 T 100 12"
                  fill="none"
                  stroke={selectedNode.status === 'alert' ? '#FF405D' : '#48A5FF'}
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            {/* Compromise vector details if alert */}
            {selectedNode.status === 'alert' && selectedNode.threatDetails && (
              <div className="p-3 rounded bg-[rgba(255,64,93,0.12)] border border-[rgba(255,64,93,0.35)] space-y-2">
                <div className="flex items-center gap-1.5 text-[#FF405D] font-command font-bold text-[11px]">
                  <ShieldAlert className="w-4 h-4 animate-bounce" />
                  <span>ACTIVE INTRUSION DETECTED</span>
                </div>
                <p className="text-[11px] text-[#dfe2f0] leading-tight">
                  {selectedNode.threatDetails.vector}
                </p>
                <div className="text-[10px] font-mono-code text-[#c0c7d4]/90 space-y-0.5">
                  <div>MITRE: <span className="text-[#FF405D]">{selectedNode.threatDetails.mitreId}</span></div>
                  <div>HEX: <span className="text-[#48A5FF]">{selectedNode.threatDetails.payloadSnippet}</span></div>
                </div>
              </div>
            )}

            {/* Node Tactical Defense Actions */}
            <div className="space-y-2 pt-2 border-t border-[rgba(72,165,255,0.1)]">
              {selectedNode.status === 'isolated' ? (
                <button
                  onClick={() => {
                    playSuccess();
                    onRestoreNode(selectedNode.id);
                  }}
                  onMouseEnter={playHover}
                  className="w-full py-2.5 px-3 rounded bg-[#35E6A1] hover:bg-[#2ce19c] text-[#070B14] font-command font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(53,230,161,0.4)] transition-all"
                >
                  <Unlock className="w-4 h-4" />
                  <span>INITIATE GRID RECOVERY</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    playIsolate();
                    onIsolateNode(selectedNode.id);
                  }}
                  onMouseEnter={playHover}
                  className="w-full py-2.5 px-3 rounded bg-[#FF405D] hover:bg-[#ff2647] text-white font-command font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,64,93,0.45)] transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>ENGAGE OPTICAL AIR-GAP ISOLATION</span>
                </button>
              )}

              {selectedNode.status === 'alert' && (
                <button
                  onClick={() => {
                    playSuccess();
                    onPatchNode(selectedNode.id);
                  }}
                  onMouseEnter={playHover}
                  className="w-full py-2 px-3 rounded bg-[#18263D] hover:bg-[#263753] border border-[#48A5FF]/40 text-[#48A5FF] font-command font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>APPLY SCADA CRYPTO MICRO-PATCH</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Event Telemetry Stream */}
        <div className="hud-card p-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-command font-bold uppercase tracking-widest text-[#48A5FF]">
              REAL-TIME EVENT LOG
            </span>
            <span className="text-[10px] font-mono-code text-[#35E6A1]">LIVE STREAM</span>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono-code max-h-[160px] overflow-y-auto pr-1">
            <div className="p-1.5 rounded bg-[#0D1422] border border-[rgba(72,165,255,0.08)]">
              <span className="text-[#8a919d]">12:04:18 </span>
              <span className="text-[#FF405D] font-bold">[CRITICAL] </span>
              <span className="text-[#dfe2f0]">SUB-BETA unauthorized breaker trip packet drop.</span>
            </div>
            <div className="p-1.5 rounded bg-[#0D1422] border border-[rgba(72,165,255,0.08)]">
              <span className="text-[#8a919d]">12:03:50 </span>
              <span className="text-[#35E6A1] font-bold">[SYNC] </span>
              <span className="text-[#dfe2f0]">BESS-01 frequency governor locked at 60.02 Hz.</span>
            </div>
            <div className="p-1.5 rounded bg-[#0D1422] border border-[rgba(72,165,255,0.08)]">
              <span className="text-[#8a919d]">12:02:11 </span>
              <span className="text-[#F4C95D] font-bold">[WARN] </span>
              <span className="text-[#dfe2f0]">SUB-GAMMA harmonic distortion ±1.4% detected.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
