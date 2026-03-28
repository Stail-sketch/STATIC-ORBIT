import { useGameStore } from './stores/gameStore';
import { useSocket } from './hooks/useSocket';
import TitleScreen from './components/screens/TitleScreen';
import LobbyScreen from './components/screens/LobbyScreen';
import GameScreen from './components/screens/GameScreen';
import ResultScreen from './components/screens/ResultScreen';
import BriefingScreen from './components/screens/BriefingScreen';
import PhaseChangeScreen from './components/screens/PhaseChangeScreen';
import ChapterScreen from './components/screens/ChapterScreen';
import ScanlineOverlay from './components/effects/ScanlineOverlay';
import SettingsPanel from './components/ui/SettingsPanel';

export default function App() {
  useSocket();
  const screen = useGameStore((s) => s.screen);

  return (
    <div className="app">
      <ScanlineOverlay />
      <SettingsPanel />
      {screen === 'title' && <TitleScreen />}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'briefing' && <BriefingScreen />}
      {screen === 'playing' && <GameScreen />}
      {screen === 'chapter' && <ChapterScreen />}
      {screen === 'phaseChange' && <PhaseChangeScreen />}
      {screen === 'result' && <ResultScreen />}
    </div>
  );
}
