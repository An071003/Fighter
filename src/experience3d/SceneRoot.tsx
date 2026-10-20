import React, { Suspense } from 'react';
import { AircraftRig, AircraftRigProvider } from './aircraft/AircraftRig';
import { ExplodeController } from './aircraft/ExplodeController';
import { GearRig } from './aircraft/GearRig';
import { JetModel } from './aircraft/JetModel';
import { PartPicker } from './aircraft/PartPicker';
import { FlightDirector } from './flight/FlightDirector';
import { ParallaxEnvironment } from './flight/ParallaxEnvironment';
import { QualityManager } from './quality/QualityManager';
import { ResourceBoundary } from './quality/ResourceBoundary';
import { CameraRig } from './scene/CameraRig';
import { StudioLighting } from './scene/StudioLighting';
import { Turntable } from './scene/Turntable';
import { StoryAnchorProjector } from './story/StoryAnchorProjector';
import { Atmosphere } from './vfx/Atmosphere';
import { AircraftSystemsVfx } from './vfx/AircraftSystemsVfx';
import { AirflowStreamlines } from './vfx/AirflowStreamlines';
import { EngineExhaust } from './vfx/EngineExhaust';
import { MaterialHighlight } from './vfx/MaterialHighlight';
import { WindTrails } from './vfx/WindTrails';

export const SceneRoot: React.FC = () => {
  return (
    <AircraftRigProvider>
      <QualityManager />
      <StudioLighting />
      <Atmosphere />

      {/* Independent Turntable Root (Jet is NOT parented under Turntable) */}
      <Turntable />

      {/* World-Origin Fixed Aircraft Anchor (X=0, Z=0 invariant) */}
      <ResourceBoundary>
        <Suspense fallback={null}>
          <AircraftRig>
            <PartPicker>
              <JetModel />
            </PartPicker>
            <AircraftSystemsVfx />
            <EngineExhaust />
            <AirflowStreamlines />
          </AircraftRig>
        </Suspense>
      </ResourceBoundary>

      {/* Authoritative Controllers & Cinematic VFX */}
      <ExplodeController />
      <GearRig />
      <FlightDirector />
      <MaterialHighlight />
      <WindTrails />
      <ParallaxEnvironment />
      <CameraRig />
      <StoryAnchorProjector />
    </AircraftRigProvider>
  );
};
