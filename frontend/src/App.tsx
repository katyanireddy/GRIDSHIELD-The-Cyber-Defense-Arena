/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { gridAPI, mapBackendNode } from './services/api';
import { motion, AnimatePresence } from 'motion/react';
import { HeaderHUD, ScreenId } from './components/HeaderHUD';
import { FrontPageScreen } from './components/screens/FrontPageScreen';
import { DigitalTwinScreen } from './components/screens/DigitalTwinScreen';
import { ThreatMatrixScreen } from './components/screens/ThreatMatrixScreen';
import { EquilibriumScreen } from './components/screens/EquilibriumScreen';
import { HolographicTwinScreen } from './components/screens/HolographicTwinScreen';
import { WarRoomScreen } from './components/screens/WarRoomScreen';
import { INITIAL_NODES, INITIAL_CONNECTIONS, INITIAL_ALERTS } from './data/initialData';
import { GridNode, GridConnection, SIEMAlert } from './types/grid';
import { useSound } from './hooks/useSound';

export default function App() {
  // Always default to 'frontpage' so the opening page is displayed immediately on site open
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('frontpage');
  const [nodes, setNodes] = useState<GridNode[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<GridConnection[]>(INITIAL_CONNECTIONS);
  const [alerts, setAlerts] = useState<SIEMAlert[]>(INITIAL_ALERTS);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('N-01');
  const [islandModeActive, setIslandModeActive] = useState<boolean>(false);
    const [apiError, setApiError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  const refreshGrid = useCallback(async () => {
    try {
      const response = await gridAPI.getGrid();
      setNodes(
  Object.entries(response.nodes).map(([id, node]) =>
    mapBackendNode(node, id)
  )
);
      setIsBackendConnected(true);
      setApiError(null);
    } catch (error) {
      setIsBackendConnected(false);
      setApiError(
        error instanceof Error ? error.message : 'Backend connection failed'
      );
    }
  }, []);

  useEffect(() => {
    void refreshGrid();
  }, [refreshGrid]);

  const { playIsolate, playSuccess, playAlert } = useSound();

  // Handlers for node defense
  const handleIsolateNode = async (id: string) => {
  try {
    await gridAPI.mitigate([id]);
    await refreshGrid();
    playIsolate();
  } catch (error) {
    setApiError(
      error instanceof Error ? error.message : 'Node isolation failed'
    );
  }
};

const handleExecutePlaybookStep = async (actionCode: string) => {
  if (actionCode === 'AIRGAP_ISO') {
    await gridAPI.mitigate(['N-01']);
    await refreshGrid();
    return;
  }
  else if (actionCode === 'FORCE_ISLAND') {
  await gridAPI.activateIslandMode();
  await refreshGrid();
  setIslandModeActive(true);
}
else if (actionCode === 'VERIFY_HASH') {
  const result = await gridAPI.verifyHash();
  await refreshGrid();

  if (result.integrity_ok) {
    console.log('Configuration integrity verified.');
  } else {
    alert('⚠️ Configuration integrity mismatch detected!');
  }
} else {
  console.log(`Simulated playbook action: ${actionCode}`);
}
};



  const handleRestoreNode = async (id: string) => {
  try {
    await gridAPI.recover();
    await refreshGrid();

    setAlerts((prev) =>
  prev.map((alert) =>
    alert.status === 'ACTIVE'
      ? { ...alert, status: 'CONTAINED' }
      : alert
  )
);

    playSuccess();
  } catch (error) {
    setApiError(
      error instanceof Error
        ? error.message
        : 'Grid recovery failed'
    );
  }
};

  const handlePatchNode = (id: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              status: 'nominal',
              threatDetails: undefined,
              frequencyHz: 60.00,
            }
          : n
      )
    );
    setAlerts((prev) =>
      prev.map((a) => (a.targetNodeId === id ? { ...a, status: 'CONTAINED' } : a))
    );
  };

  // Toggle microgrid bulk island mode
  const handleToggleIslandMode = () => {
    const next = !islandModeActive;
    setIslandModeActive(next);
    if (next) {
      setNodes((prev) =>
        prev.map((n) => (n.id === 'sub-alpha' ? { ...n, code: 'SUB-ALPHA // ISLAND MODE' } : n))
      );
    } else {
      setNodes((prev) =>
        prev.map((n) => (n.id === 'sub-alpha' ? { ...n, code: 'SUB-ALPHA // 60.00Hz' } : n))
      );
    }
  };

  // Handlers for SIEM quarantine
  const handleQuarantineAlert = async (alertId: string) => {
  const alert = alerts.find((a) => a.id === alertId);

  if (!alert) {
    setApiError('Selected alert not found');
    return;
  }

  try {
    await gridAPI.mitigate([alert.targetNodeId]);

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, status: 'QUARANTINED' }
          : a
      )
    );

    await refreshGrid();
    playIsolate();
  } catch (error) {
    setApiError(
      error instanceof Error
        ? error.message
        : 'Quarantine failed'
    );
  }
};
const handleContainAlert = async (alertId: string) => {
  const alert = alerts.find((a) => a.id === alertId);

  if (!alert) {
    setApiError('Selected alert not found');
    return;
  }

  try {
    await gridAPI.mitigate([alert.targetNodeId]);

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: 'CONTAINED' } : a
      )
    );

    await refreshGrid();
    playSuccess();
  } catch (error) {
    setApiError(
      error instanceof Error ? error.message : 'Alert containment failed'
    );
  }
};

  // Simulation drill trigger
  const handleTriggerSimulatedAttack = async (type: string) => {
  // Current backend supports False Data Injection simulation.
  // Target the North Substation for the demo.
  const targetNodeId = 'N-01';

  try {
    playAlert();

    await gridAPI.attack([targetNodeId], 0.12);

    // Refresh telemetry after attack
    await refreshGrid();

    // Run AI detection against the changed telemetry
    const detectionResponse = await gridAPI.detect();

    const detections = detectionResponse.detections ?? [];

    const newAlerts: SIEMAlert[] = detections.map((detection, index) => ({
      id: `FDI-${Date.now()}-${index}`,
      timestamp: new Date().toISOString(),
      sourceIp: 'SIMULATED-ATTACKER',
      targetNodeId: detection.node_id,
      threatType: detection.prediction,
      severity: detection.anomaly_score >= 80 ? 'CRITICAL' : 'WARNING',
      protocol: 'SIMULATED',
      mitreTechnique: 'T0855',
      description: detection.reason,
      status: 'ACTIVE',
      rawHex: 'SIMULATED FDI TELEMETRY',
    }));

    setAlerts(newAlerts);
    setSelectedNodeId(targetNodeId);
  } catch (error) {
    setApiError(
      error instanceof Error ? error.message : 'Attack simulation failed'
    );
  }
};

  const handleClearAttacks = async () => {
  try {
    await gridAPI.reset();
    await refreshGrid();

    setAlerts([]);
    setIslandModeActive(false);
    setSelectedNodeId('N-01');
    setApiError(null);

    playSuccess();
  } catch (error) {
    setApiError(
      error instanceof Error ? error.message : 'Simulation reset failed'
    );
  }
};

  const activeAlertCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  const isOpeningPage = currentScreen === 'frontpage';

  return (
    <div className="min-h-screen bg-[#070B14] text-[#dfe2f0] flex flex-col relative selection:bg-[#48A5FF]/30 selection:text-[#48A5FF]">
      {/* Background CRT scanline atmosphere */}
      <div className="fixed inset-0 scanline-overlay z-50 pointer-events-none opacity-20"></div>

      {/* 
        CRITICAL: Render HeaderHUD ONLY when inside the Command Centre!
        When on the opening page (frontpage), the opening page is displayed full-screen 
        just like in the user's screenshot.
      */}
      {!isOpeningPage && (
        <HeaderHUD
          currentScreen={currentScreen}
          onScreenChange={setCurrentScreen}
          islandModeActive={islandModeActive}
          onToggleIslandMode={handleToggleIslandMode}
          activeAlertCount={activeAlertCount}
        />
      )}

      {/* Main Content Area with Smooth Page Transitions */}
      <main className="flex-1 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* THE OPENING FRONT PAGE */}
          {currentScreen === 'frontpage' && (
            <motion.div
              key="frontpage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.99 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <FrontPageScreen onEnterCommand={(target = 'topology') => setCurrentScreen(target)} />
            </motion.div>
          )}

          {/* COMMAND CENTRE SCREENS */}
          {currentScreen === 'topology' && (
            <motion.div
              key="topology"
              initial={{ opacity: 0, y: 16, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.995 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <DigitalTwinScreen
                nodes={nodes}
                connections={connections}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                onIsolateNode={handleIsolateNode}
                onRestoreNode={handleRestoreNode}
                onPatchNode={handlePatchNode}
              />
            </motion.div>
          )}

          {currentScreen === 'threats' && (
            <motion.div
              key="threats"
              initial={{ opacity: 0, y: 16, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.995 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <ThreatMatrixScreen
                alerts={alerts}
                onQuarantineAlert={handleQuarantineAlert}
                onContainAlert={handleContainAlert}
              />
            </motion.div>
          )}

          {currentScreen === 'equilibrium' && (
            <motion.div
              key="equilibrium"
              initial={{ opacity: 0, y: 16, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.995 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <EquilibriumScreen />
            </motion.div>
          )}

          {currentScreen === 'hologram' && (
            <motion.div
              key="hologram"
              initial={{ opacity: 0, y: 16, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.995 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <HolographicTwinScreen />
            </motion.div>
          )}

          {currentScreen === 'warroom' && (
            <motion.div
              key="warroom"
              initial={{ opacity: 0, y: 16, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.995 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <WarRoomScreen
                onTriggerSimulatedAttack={handleTriggerSimulatedAttack}
                onClearAttacks={handleClearAttacks}
                onExecuteStep={handleExecutePlaybookStep}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Command HUD Footer - ONLY shown when inside the Command Centre */}
      {!isOpeningPage && (
        <footer className="bg-[#0D1422] border-t border-[rgba(72,165,255,0.12)] px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono-code text-[#8a919d] z-20">
          <div className="flex items-center gap-4">
            <span className="text-[#dfe2f0]">GRIDSHIELD COMMAND // v2.6.4</span>
            <span>STATION ID: US-NE-MG-08</span>
            <span className="text-[#35E6A1] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#35E6A1] animate-pulse"></span>
              ALL DEFENSE PROTOCOLS OPERATIONAL
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('frontpage')}
              className="text-[#48A5FF] hover:underline"
            >
              ← RETURN TO OPENING PAGE
            </button>
            <span>NERC CIP-005 COMPLIANT</span>
          </div>
        </footer>
      )}
    </div>
  );
}
