import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  ShieldAlert, 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  RotateCcw, 
  Clock, 
  Zap, 
  Lock, 
  Radio, 
  AlertTriangle, 
  Award 
} from 'lucide-react';
import { IncidentPlaybook } from '../../types/grid';
import { INCIDENT_PLAYBOOKS } from '../../data/initialData';
import { useSound } from '../../hooks/useSound';

interface WarRoomScreenProps {
  onTriggerSimulatedAttack: (type: string) => void;
  onClearAttacks: () => void;
  onExecuteStep: (actionCode: string) => Promise<void>;
}

export const WarRoomScreen: React.FC<WarRoomScreenProps> = ({
  onTriggerSimulatedAttack,
  onClearAttacks,
  onExecuteStep,
}) => {
  const { playClick, playAlert, playIsolate, playSuccess, playHover, playKeypress } = useSound();

  const [playbooks, setPlaybooks] = useState<IncidentPlaybook[]>(INCIDENT_PLAYBOOKS);
  const [activePlaybookId, setActivePlaybookId] = useState<string>('PB-01');
  const [activeDrillName, setActiveDrillName] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(240);
  const [drillRunning, setDrillRunning] = useState<boolean>(false);

  const activePlaybook = playbooks.find((p) => p.id === activePlaybookId) || playbooks[0];

  // Drill countdown timer
  useEffect(() => {
    if (!drillRunning || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [drillRunning, timerSeconds]);

  const handleLaunchDrill = (drillKey: string, drillTitle: string) => {
    playAlert();
    setActiveDrillName(drillTitle);
    setDrillRunning(true);
    setTimerSeconds(240);

    // Reset steps of active playbook
    setPlaybooks((prev) =>
      prev.map((pb) => ({
        ...pb,
        steps: pb.steps.map((s) => ({ ...s, completed: false })),
      }))
    );

    onTriggerSimulatedAttack(drillKey);
  };

  const handleToggleStep = async (stepId: string) => {
  const step = activePlaybook.steps.find((s) => s.id === stepId);
  if (!step) return;

  // If already completed, allow checklist toggle-off
  if (step.completed) {
    playClick();

    setPlaybooks((prev) =>
      prev.map((pb) =>
        pb.id === activePlaybookId
          ? {
              ...pb,
              steps: pb.steps.map((s) =>
                s.id === stepId ? { ...s, completed: false } : s
              ),
            }
          : pb
      )
    );

    return;
  }

  try {
    await onExecuteStep(step.actionCode);

    if (step.actionCode === 'AIRGAP_ISO') {
      playIsolate();
    } else {
      playSuccess();
    }

    setPlaybooks((prev) =>
      prev.map((pb) => {
        if (pb.id !== activePlaybookId) return pb;

        const updatedSteps = pb.steps.map((s) =>
          s.id === stepId ? { ...s, completed: true } : s
        );

        const allDone = updatedSteps.every((s) => s.completed);
        if (allDone) playSuccess();

        return { ...pb, steps: updatedSteps };
      })
    );
  } catch (error) {
    console.error('Failed to execute playbook step:', error);
    alert(
      error instanceof Error
      ? error.message
      : 'Playbook step execution failed'
  );
  playAlert();
}
};

  const completedStepCount = activePlaybook.steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedStepCount / activePlaybook.steps.length) * 100);
  const isMissionCleared = progressPercent === 100;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[calc(100vh-80px)]">
      {/* LEFT: Drill Scenarios & Launchpad (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="hud-card p-4">
          <div className="flex items-center justify-between mb-3 border-b border-[rgba(72,165,255,0.1)] pb-2">
            <div>
              <span className="text-[10px] font-command font-bold uppercase tracking-widest text-[#FF405D]">
                CYBER-PHYSICAL THREAT DRILLS
              </span>
              <h2 className="text-sm font-command font-bold text-[#dfe2f0]">WAR ROOM SIMULATOR</h2>
            </div>
            <Flame className="w-4 h-4 text-[#FF405D] animate-pulse" />
          </div>

          <p className="text-xs text-[#c0c7d4] mb-3">
            Trigger live scenario drills to test automated circuit isolation, operator response time, and forensic telemetry under attack:
          </p>

          <div className="space-y-2.5">
            {[
              {
                id: 'aurora',
                title: 'Aurora Generator Attack',
                desc: 'Rapid out-of-phase breaker switching targeting turbine shaft stress.',
                severity: 'CRITICAL',
              },
              {
                id: 'ransomware',
                title: 'SCADA DNP3 Outstation Flood',
                desc: 'Buffer overflow injection forcing unauthorized breaker trips.',
                severity: 'CRITICAL',
              },
              {
                id: 'blacksky',
                title: 'Black Sky Grid Islanding',
                desc: 'Bulk transmission disconnect; test synthetic inertia and battery response.',
                severity: 'HIGH',
              },
              {
                id: 'spoofing',
                title: 'GPS Synchrophasor Spoofing',
                desc: 'Manipulate IEEE C37.118 time-tags to induce phase angle miscalculation.',
                severity: 'MEDIUM',
              },
            ].map((drill) => (
              <div
                key={drill.id}
                className="p-3 rounded bg-[#0D1422] border border-[rgba(72,165,255,0.12)] hover:border-[#FF405D] transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-command font-bold text-xs text-[#dfe2f0] group-hover:text-[#FF405D]">
                    {drill.title}
                  </span>
                  <span
                    className={`text-[9px] font-command font-bold px-1.5 py-0.5 rounded ${
                      drill.severity === 'CRITICAL'
                        ? 'bg-[#FF405D]/20 text-[#FF405D] border border-[#FF405D]/40'
                        : 'bg-[#F4C95D]/20 text-[#F4C95D] border border-[#F4C95D]/40'
                    }`}
                  >
                    {drill.severity}
                  </span>
                </div>

                <p className="text-[11px] text-[#8a919d] mb-2 leading-tight">{drill.desc}</p>

                <button
                  onClick={() => handleLaunchDrill(drill.id, drill.title)}
                  onMouseEnter={playHover}
                  className="w-full py-1.5 rounded bg-[#18263D] hover:bg-[#FF405D] text-[#48A5FF] hover:text-white font-command font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Play className="w-3 h-3" />
                  <span>SIMULATE SCENARIO</span>
                </button>
              </div>
            ))}
          </div>

          {/* Reset / Clear Drills */}
          <div className="mt-4 pt-3 border-t border-[rgba(72,165,255,0.1)]">
            <button
              onClick={() => {
                playSuccess();
                setActiveDrillName(null);
                setDrillRunning(false);
                onClearAttacks();
              }}
              onMouseEnter={playHover}
              className="w-full py-2 rounded bg-[#070B14] hover:bg-[#111C2D] border border-[rgba(72,165,255,0.2)] text-[#c0c7d4] font-command font-bold text-xs flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>CLEAR DRILL STATE // RESTORE NOMINAL</span>
            </button>
          </div>
        </div>
      </div>

      {/* CENTER & RIGHT: Live Incident Commander Checklist & Playbook Execution (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Active Incident Banner */}
        <div className={`hud-card p-4 ${drillRunning ? 'hud-card-alert' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(72,165,255,0.1)] pb-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    drillRunning ? 'bg-[#FF405D] animate-ping' : 'bg-[#35E6A1]'
                  }`}
                ></span>
                <span className="text-[10px] font-command font-bold uppercase tracking-widest text-[#48A5FF]">
                  INCIDENT RESPONSE PLAYBOOK: {activePlaybook.id}
                </span>
              </div>
              <h3 className="font-command font-bold text-lg text-[#dfe2f0]">
                {activeDrillName ? `ACTIVE DRILL: ${activeDrillName}` : activePlaybook.title}
              </h3>
            </div>

            <div className="flex items-center gap-3 font-mono-code text-xs">
              <div className="p-2 bg-[#0D1422] rounded border border-[rgba(72,165,255,0.15)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F4C95D]" />
                <div>
                  <span className="text-[9px] text-[#8a919d] block">CONTAINMENT CLOCK</span>
                  <span className="text-base font-bold text-[#dfe2f0] tabular-nums">
                    {formatTimer(timerSeconds)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-mono-code mb-1">
              <span className="text-[#8a919d]">PLAYBOOK COMPLETION</span>
              <span className={isMissionCleared ? 'text-[#35E6A1] font-bold' : 'text-[#48A5FF] font-bold'}>
                {completedStepCount} / {activePlaybook.steps.length} STEPS ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-[#0D1422] rounded-full overflow-hidden border border-[rgba(72,165,255,0.15)]">
              <div
                className={`h-full transition-all duration-300 ${
                  isMissionCleared ? 'bg-[#35E6A1] shadow-[0_0_12px_#35E6A1]' : 'bg-[#48A5FF]'
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Mission Cleared Banner if all steps checked */}
          {isMissionCleared && (
            <div className="mb-4 p-3 rounded bg-[rgba(53,230,161,0.15)] border border-[rgba(53,230,161,0.4)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-[#35E6A1]" />
                <div>
                  <span className="font-command font-bold text-sm text-[#35E6A1] block">
                    THREAT VECTOR MITIGATED // MISSION CLEARED
                  </span>
                  <span className="text-xs text-[#dfe2f0]">
                    All cyber-physical containment interlocks verified. Microgrid stabilized.
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono-code text-[#35E6A1] font-bold">100% SECURE</span>
            </div>
          )}

          {/* Playbook Steps Checklist */}
          <div className="space-y-3">
            {activePlaybook.steps.map((step, idx) => (
              <div
                key={step.id}
                onClick={() => handleToggleStep(step.id)}
                onMouseEnter={playHover}
                className={`p-3.5 rounded border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  step.completed
                    ? 'bg-[#0D1422]/60 border-[rgba(53,230,161,0.3)] opacity-85'
                    : 'bg-[#0D1422] border-[rgba(72,165,255,0.2)] hover:border-[#48A5FF] hover:bg-[#18263D]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border transition-all mt-0.5 ${
                      step.completed
                        ? 'bg-[#35E6A1] border-[#35E6A1] text-[#070B14]'
                        : 'border-[rgba(72,165,255,0.4)] bg-[#111C2D]'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4 font-bold" />
                    ) : (
                      <span className="text-[10px] font-mono-code text-[#8a919d] font-bold">
                        {idx + 1}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-command font-bold text-sm ${
                          step.completed ? 'text-[#35E6A1] line-through' : 'text-[#dfe2f0]'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-[#111C2D] text-[#8a919d] border border-[rgba(72,165,255,0.1)]">
                        ROLE: {step.requiredRole}
                      </span>
                    </div>

                    <p className="text-xs text-[#c0c7d4] mt-1">{step.description}</p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-[10px] font-command font-bold px-2 py-1 rounded block ${
                      step.completed
                        ? 'bg-[#35E6A1]/20 text-[#35E6A1]'
                        : 'bg-[#48A5FF]/15 text-[#48A5FF]'
                    }`}
                  >
                    {step.completed ? 'COMPLETED' : 'CLICK TO EXECUTE'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Post-Incident Forensic Certification */}
        <div className="hud-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-command font-bold uppercase tracking-widest text-[#48A5FF]">
              CRYPTOGRAPHIC DRILL AUDIT LEDGER
            </span>
            <span className="text-[10px] font-mono-code text-[#8a919d]">SHA-256 LEDGER #9842</span>
          </div>
          <p className="text-xs font-mono-code text-[#c0c7d4]">
            [AUDIT] Drill execution signed with hardware security module (HSM). All breaker opening timestamps logged in compliance with NERC CIP-005 & CIP-007.
          </p>
        </div>
      </div>
    </div>
  );
};
