import { Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { InstallPrompt } from './components/install/InstallPrompt';
import { AlphabetSession } from './screens/AlphabetSession';
import { CardSession } from './screens/CardSession';
import { HomeScreen } from './screens/HomeScreen';
import { LevelsScreen } from './screens/LevelsScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { SelectionScreen } from './screens/SelectionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { SessionProvider } from './state/SessionContext';
import { WordsProvider, useWordsLoad } from './state/WordsContext';
import { GlobalStyle } from './theme/GlobalStyle';
import { theme } from './theme/tokens';

function Gate() {
  const { ready, error, loaded, total } = useWordsLoad();
  if (!ready) return <LoadingScreen loaded={loaded} total={total} error={error} />;
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/levels" element={<LevelsScreen />} />
        <Route path="/select/:mode" element={<SelectionScreen />} />
        <Route path="/session/flash" element={<CardSession />} />
        <Route path="/session/alpha" element={<AlphabetSession />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/summary" element={<SummaryScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
    </SessionProvider>
  );
}

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <WordsProvider>
        <Gate />
      </WordsProvider>
    </ThemeProvider>
  );
}
