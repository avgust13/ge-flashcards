import { Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { InstallPrompt } from './components/install/InstallPrompt';
import { AlphabetSession } from './screens/AlphabetSession';
import { CardSession } from './screens/CardSession';
import { HomeScreen } from './screens/HomeScreen';
import { SelectionScreen } from './screens/SelectionScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { SessionProvider } from './state/SessionContext';
import { GlobalStyle } from './theme/GlobalStyle';
import { theme } from './theme/tokens';

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <SessionProvider>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/select/:mode" element={<SelectionScreen />} />
          <Route path="/session/flash" element={<CardSession />} />
          <Route path="/session/alpha" element={<AlphabetSession />} />
          <Route path="/summary" element={<SummaryScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <InstallPrompt />
      </SessionProvider>
    </ThemeProvider>
  );
}
