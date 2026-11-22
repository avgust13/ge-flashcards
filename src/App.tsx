import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';
import { InstallPrompt } from './components/install/InstallPrompt';
import { AlphabetScreen } from './screens/AlphabetScreen';
import { AlphabetSession } from './screens/AlphabetSession';
import { CardSession } from './screens/CardSession';
import { CourseScreen } from './screens/CourseScreen';
import { DoneScreen } from './screens/DoneScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LevelsScreen } from './screens/LevelsScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { MatrixScreen } from './screens/MatrixScreen';
import { SelectionScreen } from './screens/SelectionScreen';
import { SessionScreen } from './screens/SessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PhrasesScreen } from './screens/PhrasesScreen';
import { StatsScreen } from './screens/StatsScreen';
import { TutorScreen } from './screens/TutorScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { UnitScreen } from './screens/UnitScreen';
import { VerbsScreen } from './screens/VerbsScreen';
import { AppProvider, useBoot } from './state/AppContext';
import { SessionProvider } from './state/SessionContext';
import { WordsProvider, useWordsLoad } from './state/WordsContext';
import { GlobalStyle } from './theme/GlobalStyle';
import { theme } from './theme/tokens';

const Splash = styled.div`
  flex: 1;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 32px;
  text-align: center;
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.inkSoft};
  font-weight: 800;
`;

const SplashKa = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`;

const SplashError = styled.div`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 14px;
`;

/**
 * The legacy vocabulary screens need the 67 MB word library. It is downloaded
 * only when one of them is opened, so the course itself starts at once.
 */
function RequireWords() {
  const { ready, error, loaded, total, ensureWords } = useWordsLoad();
  useEffect(() => {
    ensureWords();
  }, [ensureWords]);
  if (!ready) return <LoadingScreen loaded={loaded} total={total} error={error} />;
  return <Outlet />;
}

function Gate() {
  const boot = useBoot();
  if (boot.status === 'loading') {
    return (
      <Splash>
        <SplashKa>გამარჯობა</SplashKa>
        Загружаем курс…
      </Splash>
    );
  }
  if (boot.status === 'error') {
    return (
      <Splash>
        <SplashKa>უი!</SplashKa>
        Не получилось запустить приложение.
        <SplashError>{boot.message}</SplashError>
      </Splash>
    );
  }
  return (
    <WordsProvider>
      <SessionProvider>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/session" element={<SessionScreen />} />
          <Route path="/done" element={<DoneScreen />} />
          <Route path="/course" element={<CourseScreen />} />
          <Route path="/course/:unitId" element={<UnitScreen />} />
          <Route path="/verbs" element={<VerbsScreen />} />
          <Route path="/verbs/:verbId" element={<MatrixScreen />} />
          <Route path="/alphabet" element={<AlphabetScreen />} />
          <Route path="/stats" element={<StatsScreen />} />
          <Route path="/phrases" element={<PhrasesScreen />} />
          <Route path="/tutor" element={<TutorScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route element={<RequireWords />}>
            <Route path="/levels" element={<LevelsScreen />} />
            <Route path="/select/:mode" element={<SelectionScreen />} />
            <Route path="/session/flash" element={<CardSession />} />
            <Route path="/session/alpha" element={<AlphabetSession />} />
            <Route path="/summary" element={<SummaryScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
    </WordsProvider>
  );
}

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AppProvider>
        <Gate />
      </AppProvider>
      <InstallPrompt />
    </ThemeProvider>
  );
}
