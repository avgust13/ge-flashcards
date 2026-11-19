import { useEffect, useMemo, useRef, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { prefetchClips, unlockAudio, stopAudio } from '../audio/player';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SpeakerButton } from '../components/ui/SpeakerButton';
import { UNITS, audioIdFor, unitOfCard } from '../content/store';
import { translit } from '../content/translit';
import type { ExplainStep } from '../content/types';
import { getCard, getSettings, requestPersistence, today } from '../db/progress';
import { introRows } from '../engine/build';
import {
  MAX_ITEM_MS,
  applyAnswer,
  buildCtx,
  exerciseFor,
  loadSavedSession,
  logReadingTime,
  markExplainSeen,
  planDaily,
  planMatrix,
  planUnit,
  saveSession,
  sessionAudioIds,
} from '../engine/run';
import {
  advance,
  currentItem,
  extend,
  isFinished,
  overBudget,
  progressFraction,
  startSession,
  stopHere,
  type SessionState,
} from '../engine/session';
import type { ExerciseResult } from '../engine/types';
import { now } from '../srs/clock';
import { newSrsCard, previewIntervals } from '../srs/fsrs';
import { AssembleExercise } from './session/AssembleExercise';
import { ChoiceExercise } from './session/ChoiceExercise';
import { SpeakExercise } from './session/SpeakExercise';
import { Body, Card, Eyebrow, Footer, Ka, Muted, Tr } from './session/parts';

export type SessionLaunch =
  | { mode: 'daily' }
  | { mode: 'unit'; unitId: number }
  | { mode: 'matrix'; verbId: string };

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
`;

const HeaderRow = styled.div`
  padding: 14px 16px 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
`;

const IconBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Chip = styled.div`
  background: #F3EBD8;
  color: ${({ theme }) => theme.colors.inkSoft};
  padding: 4px 10px;
  border-radius: 99px;
  font-weight: 900;
  font-size: 13px;
  white-space: nowrap;
`;

const Title = styled.div`
  font-size: 22px;
  font-weight: 900;
  line-height: 1.2;
  margin-top: 6px;
`;

const Para = styled.p`
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.ink};
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.line};

  &:first-child {
    border-top: none;
  }
`;

const RowText = styled.div`
  flex: 1;
  min-width: 0;
`;

const RowRu = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 2px;
`;

function initSession(launch: SessionLaunch | undefined): SessionState | null {
  const t = now();
  const day = today();
  if (!launch || launch.mode === 'daily') {
    const saved = loadSavedSession();
    if (saved) return saved;
    const plan = planDaily();
    return plan.items.length ? startSession(plan, 'daily', day, t, '/') : null;
  }
  if (launch.mode === 'unit') {
    const plan = planUnit(launch.unitId);
    return plan?.items.length ? startSession(plan, 'unit', day, t, `/course/${launch.unitId}`) : null;
  }
  const plan = planMatrix(launch.verbId);
  return plan.items.length ? startSession(plan, 'matrix', day, t, `/verbs/${launch.verbId}`) : null;
}

function findExplain(stepId: string): ExplainStep | null {
  for (const u of UNITS) {
    for (const s of u.steps) if (s.kind === 'explain' && s.id === stepId) return s;
  }
  return null;
}

/** The one session runner: daily session, unit practice and the matrix drill. */
export function SessionScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  const location = useLocation();
  const launch = location.state as SessionLaunch | undefined;

  const [state, setState] = useState<SessionState | null>(() => initSession(launch));
  const [timeUp, setTimeUp] = useState(false);
  const itemStart = useRef(Date.now());
  const settings = getSettings();
  const showTr = settings.translit === 'always';

  const item = state ? currentItem(state) : null;
  const finished = !state || isFinished(state);

  // One exercise per queue position; rebuilt only when the position changes.
  const ex = useMemo(
    () => (item?.type === 'card' ? exerciseFor(item) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.id, state?.pos],
  );

  useEffect(() => {
    itemStart.current = Date.now();
  }, [state?.pos]);

  useEffect(() => () => stopAudio(), []);

  // Fetch the session's clips up front: the service worker caches them, so the
  // session keeps its sound if the connection drops halfway.
  useEffect(() => {
    if (state) prefetchClips(sessionAudioIds(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.id]);

  // A card with no usable example cannot be asked: skip it rather than stall.
  useEffect(() => {
    if (state && item?.type === 'card' && !ex) setState(advance(state, 0));
  }, [state, item, ex]);

  useEffect(() => {
    if (!state || !finished) return;
    saveSession(null);
    void requestPersistence();
    navigate('/done', {
      replace: true,
      state: {
        mode: state.mode,
        results: state.results,
        activeMs: state.activeMs,
        origin: state.origin,
      },
    });
  }, [state, finished, navigate]);

  if (!state) {
    return (
      <Screen>
        <HeaderRow>
          <IconBtn onClick={() => navigate(-1)} aria-label="Назад">
            <Icon name="back" size={20} />
          </IconBtn>
        </HeaderRow>
        <Body style={{ justifyContent: 'center', textAlign: 'center' }}>
          <Title>Пока нечего повторять</Title>
          <Muted>Новый материал и повторения появятся в следующем занятии.</Muted>
        </Body>
        <Footer>
          <Pill kind="primary" size="lg" style={{ flex: 1 }} onClick={() => navigate('/')}>
            На главную
          </Pill>
        </Footer>
      </Screen>
    );
  }

  const spent = () => Math.min(Date.now() - itemStart.current, MAX_ITEM_MS);

  const move = (next: SessionState) => {
    if (next.mode === 'daily' && overBudget(next)) setTimeUp(true);
    setState(next);
  };

  const onAnswer = (result: ExerciseResult) => {
    if (item?.type !== 'card' || !ex) return;
    move(applyAnswer(state, item, ex, result));
  };

  const onRead = () => {
    const ms = spent();
    logReadingTime(ms);
    if (item?.type === 'explain') markExplainSeen(item.stepId);
    const next = advance(state, ms);
    saveSession(next);
    move(next);
  };

  const close = () => {
    stopAudio();
    navigate(state.origin, { replace: true });
  };

  const header = (
    <HeaderRow>
      <IconBtn onClick={close} aria-label="Закрыть занятие">
        <Icon name="close" size={20} />
      </IconBtn>
      <ProgressBar value={progressFraction(state)} color={theme.colors.success} />
      <Chip>{Math.floor(state.activeMs / 60_000)} мин</Chip>
    </HeaderRow>
  );

  if (timeUp && !finished) {
    return (
      <Screen>
        {header}
        <Body style={{ justifyContent: 'center', textAlign: 'center' }}>
          <Title>Время на сегодня вышло</Title>
          <Muted>
            Осталось заданий: {state.items.length - state.pos}. Их можно доделать сейчас или оставить на
            завтра — повторения никуда не пропадут.
          </Muted>
        </Body>
        <Footer>
          <Pill
            kind="ghost"
            size="lg"
            style={{ flex: 1 }}
            onClick={() => {
              setTimeUp(false);
              setState(stopHere(state));
            }}
          >
            Закончить
          </Pill>
          <Pill
            kind="primary"
            size="lg"
            style={{ flex: 1.3 }}
            onClick={() => {
              setTimeUp(false);
              setState(extend(state, 5 * 60_000));
            }}
          >
            Ещё 5 минут
          </Pill>
        </Footer>
      </Screen>
    );
  }

  if (item?.type === 'explain') {
    const step = findExplain(item.stepId);
    return (
      <Screen onPointerDown={unlockAudio}>
        {header}
        <Body>
          <Card>
            <Eyebrow>Урок {item.unit} · новая идея</Eyebrow>
            <Title>{step?.titleRu}</Title>
            {step?.bodyRu.map((p, i) => <Para key={i}>{p}</Para>)}
          </Card>
          {step && step.examples.length > 0 && (
            <Card>
              <Rows>
                {step.examples.map((e, i) => (
                  <Row key={i}>
                    <RowText>
                      <Ka $size={22}>{e.ka}</Ka>
                      {showTr && <Tr>{translit(e.ka)}</Tr>}
                      <RowRu>{e.ru}</RowRu>
                    </RowText>
                    <SpeakerButton audio={audioIdFor(e.ka)} />
                  </Row>
                ))}
              </Rows>
            </Card>
          )}
        </Body>
        <Footer>
          <Pill kind="primary" size="lg" style={{ flex: 1 }} onClick={onRead}>
            Понятно
          </Pill>
        </Footer>
      </Screen>
    );
  }

  if (item?.type === 'intro') {
    const rows = introRows(item.cards, buildCtx());
    return (
      <Screen onPointerDown={unlockAudio}>
        {header}
        <Body>
          <Card>
            <Eyebrow>Новое · {item.title}</Eyebrow>
            <Rows style={{ marginTop: 6 }}>
              {rows.map((r) => (
                <Row key={r.id}>
                  <RowText>
                    {r.ka && <Ka $size={22}>{r.ka}</Ka>}
                    {r.ka && showTr && <Tr>{translit(r.ka)}</Tr>}
                    <RowRu>{r.ru}</RowRu>
                    {r.note && <Muted style={{ marginTop: 4 }}>{r.note}</Muted>}
                  </RowText>
                  <SpeakerButton audio={r.audio} />
                </Row>
              ))}
            </Rows>
          </Card>
          <Muted style={{ textAlign: 'center' }}>Послушай и прочитай. Дальше — тренировка.</Muted>
        </Body>
        <Footer>
          <Pill kind="primary" size="lg" style={{ flex: 1 }} onClick={onRead}>
            <Icon name="play" size={18} />
            Тренировать
          </Pill>
        </Footer>
      </Screen>
    );
  }

  if (item?.type === 'card' && ex) {
    const card = getCard(ex.card);
    const intervals =
      ex.kind === 'speak' && item.counted
        ? previewIntervals(
            card ?? newSrsCard(ex.card, 'c', unitOfCard(ex.card), now()),
            now(),
            settings.desiredRetention,
          )
        : null;
    return (
      <Screen onPointerDown={unlockAudio}>
        {header}
        {ex.kind === 'assemble' ? (
          <AssembleExercise key={ex.uid} ex={ex} showTr={showTr} autoplay={settings.autoplay} onDone={onAnswer} />
        ) : ex.kind === 'speak' ? (
          <SpeakExercise
            key={ex.uid}
            ex={ex}
            showTr={showTr}
            autoplay={settings.autoplay}
            intervals={intervals}
            onDone={onAnswer}
          />
        ) : (
          <ChoiceExercise key={ex.uid} ex={ex} showTr={showTr} autoplay={settings.autoplay} onDone={onAnswer} />
        )}
      </Screen>
    );
  }

  return <Screen>{header}</Screen>;
}
