import { useState } from 'react';
import styled, { css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { playClip, unlockAudio } from '../audio/player';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionLabel } from '../components/ui/SectionLabel';
import { SpeakerButton } from '../components/ui/SpeakerButton';
import { LETTERS, LETTER_GROUPS, LETTER_PAIRS, audioIdFor, getLetter } from '../content/store';
import type { Letter } from '../content/types';
import { getCard } from '../db/progress';
import { useProgressVersion } from '../db/useProgress';
import { nextLetterGroup } from '../engine/run';

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
  padding: 4px 20px 12px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  flex: 1;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: ${({ theme }) => theme.shadow};
  margin-bottom: 16px;
`;

const Big = styled.div`
  font-size: 18px;
  font-weight: 900;
`;

const Muted = styled.div`
  font-size: 13px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const Track = styled.div`
  height: 8px;
  background: #F3EBD8;
  border-radius: 99px;
  margin: 10px 0;
  overflow: hidden;
`;

const Fill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => $pct}%;
  height: 100%;
  background: ${({ theme }) => theme.colors.success};
  border-radius: 99px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
  gap: 8px;
  margin: 8px 0 18px;
`;

type TileState = 'new' | 'learning' | 'known';

const Tile = styled.button<{ $state: TileState; $on: boolean }>`
  border: 2px solid ${({ $on, theme }) => ($on ? theme.colors.ink : 'transparent')};
  border-radius: 14px;
  padding: 8px 2px 6px;
  cursor: pointer;
  background: #fff;
  box-shadow: ${({ theme }) => theme.shadow};
  text-align: center;
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 26px;
  line-height: 1.1;
  color: ${({ theme }) => theme.colors.ink};
  ${({ $state, theme }) =>
    $state === 'known' &&
    css`
      background: ${theme.colors.successSoft};
    `}
  ${({ $state, theme }) =>
    $state === 'learning' &&
    css`
      background: ${theme.colors.warnSoft};
    `}
  ${({ $state }) =>
    $state === 'new' &&
    css`
      color: #8a8172;
    `}
`;

const TileLabel = styled.span`
  display: block;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 3px;
`;

const Detail = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
`;

const DetailLetter = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 60px;
  line-height: 1;
  min-width: 64px;
  text-align: center;
`;

const Sound = styled.div`
  font-size: 20px;
  font-weight: 900;

  span {
    font-size: 13px;
    font-weight: 700;
    font-style: italic;
    color: ${({ theme }) => theme.colors.inkSoft};
    margin-left: 8px;
  }
`;

const WordRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
`;

const Ka = styled.span`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 18px;
`;

const PairRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 8px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.line};

  &:first-of-type {
    border-top: none;
  }
`;

const PairWord = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const Footer = styled.div`
  padding: 10px 20px 16px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LinkBtn = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
  padding: 4px;
`;

function stateOf(l: Letter): TileState {
  const c = getCard(`l:${l.ch}`);
  if (!c) return 'new';
  return c.state === 2 ? 'known' : 'learning';
}

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

/** All 33 letters by teaching group, with their sounds, and extra practice. */
export function AlphabetScreen() {
  const navigate = useNavigate();
  useProgressVersion();
  const [selected, setSelected] = useState<string | null>(null);

  const known = LETTERS.filter((l) => stateOf(l) === 'known').length;
  const started = LETTERS.filter((l) => stateOf(l) !== 'new').length;
  const next = nextLetterGroup();
  const sel = selected ? getLetter(selected) : undefined;

  const pick = (l: Letter) => {
    unlockAudio();
    setSelected(l.ch);
    void playClip(audioIdFor(l.say));
  };

  const start = (learnNext: boolean) => {
    unlockAudio();
    navigate('/session', { state: { mode: 'alphabet', learnNext } });
  };

  const similar = (chars: string[]) =>
    chars
      .map((ch) => getLetter(ch))
      .filter((x): x is Letter => !!x)
      .map((x) => `${x.ch} (${x.ru})`)
      .join(', ');

  return (
    <Screen>
      <ScreenHeader title="Алфавит" onBack={() => navigate('/')} />
      <Body>
        <Card>
          <Big>
            Выучено {known} из {LETTERS.length}
          </Big>
          <Track>
            <Fill $pct={Math.round((known / Math.max(1, LETTERS.length)) * 100)} />
          </Track>
          <Muted>
            Буквы приходят в «Занятии дня» по несколько в день. Здесь — весь алфавит: нажми на букву, чтобы
            услышать её. Когда буквы слова выучены, латинская подпись под ним исчезает сама.
          </Muted>
        </Card>

        {sel && (
          <Card>
            <Detail>
              <DetailLetter>{sel.ch}</DetailLetter>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Sound>
                  {sel.ru}
                  <span>{sel.tr}</span>
                </Sound>
                <Muted style={{ marginTop: 2 }}>{sel.hintRu}</Muted>
              </div>
              <SpeakerButton audio={audioIdFor(sel.say)} size={44} tone="solid" />
            </Detail>
            <WordRow>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Ka>{sel.word.ka}</Ka>
                <Muted>{sel.word.ru}</Muted>
              </div>
              <SpeakerButton audio={audioIdFor(sel.word.ka)} />
            </WordRow>
            {(sel.soundAlike.length > 0 || sel.lookAlike.length > 0) && (
              <Muted style={{ marginTop: 10 }}>
                {sel.soundAlike.length > 0 && <>Похоже звучит: {similar(sel.soundAlike)}. </>}
                {sel.lookAlike.length > 0 && <>Похоже выглядит: {similar(sel.lookAlike)}.</>}
              </Muted>
            )}
          </Card>
        )}

        {LETTER_GROUPS.map((g) => (
          <div key={g.id}>
            <SectionLabel>{g.titleRu}</SectionLabel>
            <Muted>{g.noteRu}</Muted>
            <Grid>
              {LETTERS.filter((l) => l.group === g.id).map((l) => (
                <Tile key={l.ch} type="button" $state={stateOf(l)} $on={selected === l.ch} onClick={() => pick(l)}>
                  {l.ch}
                  <TileLabel>{l.ru}</TileLabel>
                </Tile>
              ))}
            </Grid>
          </div>
        ))}

        <SectionLabel>Пары слов</SectionLabel>
        <Muted style={{ marginBottom: 8 }}>
          Слова отличаются одним звуком — мягким с выдохом или резким. Послушай оба.
        </Muted>
        <Card onPointerDown={unlockAudio}>
          {LETTER_PAIRS.map((p) => (
            <PairRow key={p.a.ka}>
              {[p.a, p.b].map((w) => (
                <PairWord key={w.ka}>
                  <SpeakerButton audio={audioIdFor(w.ka)} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <Ka>{w.ka}</Ka>
                    <Muted>{w.ru}</Muted>
                  </div>
                </PairWord>
              ))}
            </PairRow>
          ))}
        </Card>
      </Body>

      <Footer>
        {next.length > 0 && (
          <Pill kind="primary" size="lg" onClick={() => start(true)}>
            <Icon name="play" size={18} />
            Учить новые: {next.length} {plural(next.length, ['буква', 'буквы', 'букв'])}
          </Pill>
        )}
        {started > 0 && (
          <Pill kind={next.length ? 'ghost' : 'primary'} size={next.length ? 'md' : 'lg'} onClick={() => start(false)}>
            <Icon name="refresh" size={16} />
            Повторить выученные
          </Pill>
        )}
        <LinkBtn type="button" onClick={() => navigate('/select/alpha')}>
          Собрать слово по буквам (словарь с картинками)
        </LinkBtn>
      </Footer>
    </Screen>
  );
}
