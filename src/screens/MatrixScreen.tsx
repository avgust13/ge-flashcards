import { useState } from 'react';
import styled, { css } from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { playClip, unlockAudio } from '../audio/player';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { audioIdFor, examplesFor, getVerb, ruText } from '../content/store';
import { translit } from '../content/translit';
import {
  PERSONS,
  PERSON_RU,
  TENSE_ROWS,
  TENSE_RU,
  type CellKey,
  type Person,
  type Polarity,
  type Tense,
} from '../content/types';
import { getCard, getSettings } from '../db/progress';
import { useProgressVersion } from '../db/useProgress';
import { isAutomatic } from '../srs/mastery';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
`;

const Body = styled.div`
  padding: 4px 16px 12px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  flex: 1;
`;

const Persons = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 12px;
`;

const PersonBtn = styled.button<{ $on: boolean }>`
  border: none;
  border-radius: 12px;
  padding: 9px 0;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 900;
  font-size: 14px;
  background: ${({ $on, theme }) => ($on ? theme.colors.ink : '#fff')};
  color: ${({ $on, theme }) => ($on ? '#fff' : theme.colors.ink)};
  box-shadow: ${({ $on, theme }) => ($on ? 'none' : theme.shadow)};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const ColHead = styled.div`
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-align: center;
  color: ${({ theme }) => theme.colors.inkMute};
`;

const RowHead = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 900;

  span {
    font-weight: 700;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.inkSoft};
    text-align: right;
  }
`;

type CellState = 'auto' | 'learned' | 'ahead' | 'unverified';

const Cell = styled.button<{ $state: CellState }>`
  border: none;
  border-radius: 14px;
  padding: 10px 6px 8px;
  min-height: 62px;
  cursor: pointer;
  text-align: center;
  background: #fff;
  box-shadow: ${({ theme }) => theme.shadow};
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 15px;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.ink};
  overflow-wrap: anywhere;
  ${({ $state, theme }) =>
    $state === 'auto' &&
    css`
      background: ${theme.colors.successSoft};
    `}
  ${({ $state }) =>
    $state === 'ahead' &&
    css`
      opacity: 0.5;
    `}
  ${({ $state, theme }) =>
    $state === 'unverified' &&
    css`
      background: ${theme.colors.warnSoft};
      opacity: 0.7;
    `}
`;

const CellTr = styled.span`
  display: block;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 10px;
  font-style: italic;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 3px;
`;

const Note = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 14px;
  margin-top: 14px;
  box-shadow: ${({ theme }) => theme.shadow};
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const Legend = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkMute};
  margin-top: 10px;
  text-align: center;
  line-height: 1.4;
`;

const Footer = styled.div`
  padding: 10px 20px 16px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
`;

const COLS: Array<[Polarity, string]> = [
  ['aff', 'Да'],
  ['neg', 'Нет'],
  ['q', 'Вопрос'],
];

/**
 * The matrix of one verb: three tenses × statement / negation / question.
 * Negation only adds "არ" and a question only adds "?", so the grid makes
 * the central point visible — one form serves three sentences.
 */
export function MatrixScreen() {
  const navigate = useNavigate();
  useProgressVersion();
  const { verbId } = useParams<{ verbId: string }>();
  const verb = getVerb(verbId ?? '');
  const [person, setPerson] = useState<Person>('1sg');
  const settings = getSettings();
  const showTr = settings.translit === 'always';

  if (!verb) {
    return (
      <Screen>
        <ScreenHeader title="Глагол" onBack={() => navigate('/verbs')} />
      </Screen>
    );
  }

  const cellState = (t: Tense): CellState => {
    const key = `${t}.${person}` as CellKey;
    const st = verb.status[key];
    if (st !== 'verified' && st !== 'auto-verified') return 'unverified';
    const card = getCard(`c:${verb.id}.${key}`);
    if (!card) return 'ahead';
    return isAutomatic(card) ? 'auto' : 'learned';
  };

  const play = (t: Tense, pol: Polarity) => {
    const id = `c:${verb.id}.${t}.${person}`;
    const s = examplesFor(id).find((x) => x.polarity === pol && audioIdFor(x.ka)) ??
      examplesFor(id).find((x) => audioIdFor(x.ka));
    if (s) void playClip(audioIdFor(s.ka));
  };

  const learnedCells = TENSE_ROWS.flatMap((t) => PERSONS.map((p) => `c:${verb.id}.${t}.${p}`)).filter((id) =>
    getCard(id),
  ).length;

  return (
    <Screen onPointerDown={unlockAudio}>
      <ScreenHeader title={`${verb.forms.prs['1sg']} — ${verb.ru}`} onBack={() => navigate('/verbs')} />
      <Body>
        <Persons>
          {PERSONS.map((p) => (
            <PersonBtn key={p} type="button" $on={p === person} onClick={() => setPerson(p)}>
              {PERSON_RU[p]}
            </PersonBtn>
          ))}
        </Persons>

        <Grid>
          {COLS.map(([, label]) => (
            <ColHead key={label}>{label}</ColHead>
          ))}
          {TENSE_ROWS.map((t) => {
            const form = verb.forms[t][person];
            const state = cellState(t);
            return (
              <FragmentRow key={t}>
                <RowHead>
                  {TENSE_RU[t]}
                  <span>{ruText(verb.ruCells[t][person], settings.ruGender)}</span>
                </RowHead>
                {COLS.map(([pol]) => {
                  const text = pol === 'neg' ? `არ ${form}` : pol === 'q' ? `${form}?` : form;
                  return (
                    <Cell key={pol} type="button" $state={state} onClick={() => play(t, pol)}>
                      {text}
                      {showTr && <CellTr>{translit(text)}</CellTr>}
                    </Cell>
                  );
                })}
              </FragmentRow>
            );
          })}
        </Grid>

        <Legend>
          Зелёные клетки — уже на автомате. Бледные — ещё впереди по курсу.
          {verb.pastLabel === 'imperfect' && ' Прошедшее у этого глагола — «длилось», а не «случилось».'}
        </Legend>

        {verb.noteRu && <Note>{verb.noteRu}</Note>}
      </Body>

      <Footer>
        <Pill
          kind="primary"
          size="lg"
          style={{ width: '100%' }}
          disabled={learnedCells < 2}
          onClick={() => {
            unlockAudio();
            navigate('/session', { state: { mode: 'matrix', verbId: verb.id } });
          }}
        >
          <Icon name="refresh" size={18} />
          {learnedCells < 2 ? 'Прокрутка откроется после урока' : `Прокрутка: ${learnedCells} клеток`}
        </Pill>
      </Footer>
    </Screen>
  );
}

/** Keeps a tense's header and its three cells together inside the CSS grid. */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
