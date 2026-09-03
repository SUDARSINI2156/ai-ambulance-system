import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RoleSelector } from './components/RoleSelector';
import { GuidedPatientFlow } from './views/GuidedPatientFlow';
import { AdminCommandCenter } from './views/AdminCommandCenter';
import { AmbulanceHUD } from './views/AmbulanceHUD';
import { HospitalDashboard } from './views/HospitalDashboard';
import { AnalyticsView } from './views/AnalyticsView';
import { DispatchModal } from './components/DispatchModal';
import { DynamicRerouteModal } from './components/DynamicRerouteModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { EmergencyAPI } from './services/api';
import { wsClient } from './services/websocket';
import { Hospital, Ambulance, Emergency, DynamicRerouteEvent } from './types';

export const App: React.FC = () => {
  // Current Active Role: 'patient' | 'ambulance' | 'hospital' | 'admin' | 'analytics'
  const [currentRole, setCurrentRole] = useState<'patient' | 'ambulance' | 'hospital' | 'admin' | 'analytics'>('patient');
  const [isConnected, setIsConnected] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [rerouteAlert, setRerouteAlert] = useState<DynamicRerouteEvent | null>(null);

  // Fetch all live data
  const fetchData = async () => {
    try {
      const [hospRes, ambRes, emgRes] = await Promise.all([
        EmergencyAPI.getHospitals(),
        EmergencyAPI.getAmbulances(),
        EmergencyAPI.getEmergencies(),
      ]);
      setHospitals(hospRes.data);
      setAmbulances(ambRes.data);
      setEmergencies(emgRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup WebSocket connection status listener
    const unsubConn = wsClient.on('CONNECTION_CHANGE', (data) => {
      setIsConnected(data.connected);
    });
    setIsConnected(wsClient.getConnectedStatus());

    // Listen to live GPS updates
    const unsubGPS = wsClient.on('AMBULANCE_GPS_UPDATE', (data) => {
      setAmbulances((prev) =>
        prev.map((a) =>
          a.id === data.ambulance_id
            ? {
                ...a,
                current_lat: data.latitude,
                current_lng: data.longitude,
                speed_kmh: data.speed_kmh,
                heading: data.heading,
              }
            : a
        )
      );
    });

    // Listen to dynamic reroute alerts
    const unsubReroute = wsClient.on('DYNAMIC_REROUTE_ALERT', (data: DynamicRerouteEvent) => {
      setRerouteAlert(data);
      fetchData();
    });

    // Listen to new emergencies
    const unsubNewEmg = wsClient.on('NEW_EMERGENCY', () => {
      fetchData();
    });

    // Listen to hospital capacity changes
    const unsubHosp = wsClient.on('HOSPITAL_CAPACITY_CHANGED', (data) => {
      setHospitals((prev) =>
        prev.map((h) =>
          h.id === data.hospital_id
            ? {
                ...h,
                available_er_beds: data.available_er_beds,
                available_icu_beds: data.available_icu_beds,
                available_ventilators: data.available_ventilators,
                emergency_status: data.emergency_status,
              }
            : h
        )
      );
    });

    return () => {
      unsubConn();
      unsubGPS();
      unsubReroute();
      unsubNewEmg();
      unsubHosp();
    };
  }, []);

  // Primary active emergency
  const primaryEmergency = emergencies.find(
    (e) => e.status !== 'COMPLETED' && e.status !== 'CANCELLED'
  );
  const primaryAmbulance = ambulances.find((a) => a.id === primaryEmergency?.assigned_ambulance_id) || ambulances[0];
  const primaryHospital = hospitals.find((h) => h.id === primaryEmergency?.assigned_hospital_id) || hospitals[0];

  // Map role to navbar tab
  const roleToTab = (r: 'patient' | 'ambulance' | 'hospital' | 'admin' | 'analytics'): 'sos' | 'admin' | 'ambulance' | 'hospital' | 'analytics' => {
    if (r === 'patient') return 'sos';
    return r;
  };

  const tabToRole = (t: 'sos' | 'admin' | 'ambulance' | 'hospital' | 'analytics'): 'patient' | 'ambulance' | 'hospital' | 'admin' | 'analytics' => {
    if (t === 'sos') return 'patient';
    return t;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Tactical Navbar */}
      <Navbar
        activeTab={roleToTab(currentRole)}
        setActiveTab={(t) => setCurrentRole(tabToRole(t))}
        isConnected={isConnected}
        activeEmergenciesCount={emergencies.filter((e) => e.status !== 'COMPLETED').length}
        availableAmbulancesCount={ambulances.filter((a) => a.status === 'AVAILABLE').length}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Role Selector Bar: Clearly shows who is using the app */}
        <RoleSelector
          currentRole={currentRole}
          onSelectRole={(r) => setCurrentRole(r)}
        />

        {/* 1. Guided Patient Emergency Journey (The Main Consumer Flow) */}
        {currentRole === 'patient' && (
          <GuidedPatientFlow
            hospitals={hospitals}
            ambulances={ambulances}
            activeEmergency={primaryEmergency}
            onEmergencyCreated={() => fetchData()}
            onEmergencyCompleted={() => fetchData()}
          />
        )}

        {/* 2. Paramedic Ambulance Navigation HUD */}
        {currentRole === 'ambulance' && (
          <AmbulanceHUD
            ambulance={primaryAmbulance}
            activeEmergency={primaryEmergency}
            assignedHospital={primaryHospital}
            onRefresh={fetchData}
          />
        )}

        {/* 3. Hospital Emergency Desk */}
        {currentRole === 'hospital' && (
          <HospitalDashboard
            hospitals={hospitals}
            emergencies={emergencies}
            onRefresh={fetchData}
          />
        )}

        {/* 4. City Central Dispatch Command Center */}
        {currentRole === 'admin' && (
          <AdminCommandCenter
            hospitals={hospitals}
            ambulances={ambulances}
            emergencies={emergencies}
            onOpenDispatch={() => setIsDispatchModalOpen(true)}
            onRefresh={fetchData}
            onSelectEmergency={() => setCurrentRole('ambulance')}
          />
        )}

        {/* 5. Machine Learning Academic Analytics */}
        {currentRole === 'analytics' && <AnalyticsView />}
      </main>

      {/* 911 / 108 Emergency Incident Modal */}
      <DispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Real-time Dynamic Reroute Alert Notification Modal */}
      <DynamicRerouteModal
        event={rerouteAlert}
        onClose={() => setRerouteAlert(null)}
        onAccept={() => {
          setRerouteAlert(null);
          setCurrentRole('ambulance');
        }}
      />

      {/* Interactive Walkthrough / How It Works Modal */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
      />
    </div>
  );
};

export default App;
