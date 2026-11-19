import styled, { useTheme } from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import { unlockAudio } from '../audio/player';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionLabel } from '../components/ui/SectionLabel';
import { SpeakerButton } from '../components/ui/SpeakerButton';
import { UNITS, audioIdFor, getUnit } from '../content/store';
import { translit } from '../content/translit';
import { getCard, getCourse, getSettings, setCourse } from '../db/progress';
import { useProgressVersion } from '../db/useProgress';
import { GATE, unitProgress } from '../srs/mastery';

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
  margin-bottom: 14px;
`;

const Goal = styled.div`
  font-size: 15px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const Meters = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
`;

const Meter = styled.div`
  background: #FAF5EA;
  border-radius: 14px;
  padding: 10px;
  text-align: center;
`;

const MeterValue = styled.div`
  font-size: 18px;
  font-weight: 900;
`;

const MeterLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 2px;
`;

const Title = styled.div`
  font-size: 17px;
  font-weight: 900;
`;

const Para = styled.p`
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.5;
`;

const Example = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
  margin-top: 10px;

  & + & {
    margin-top: 0;
  }
`;

const Ka = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 19px;
`;

const Small = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
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

/** One unit: its goal, progress toward automatism, and the explanations to re-read. */
export function UnitScreen() {
  const navigate = useNavigate();
  const theme = useTheme();
  useProgressVersion();
  const { unitId } = useParams<{ unitId: string }>();
  const unit = getUnit(Number(unitId));

  if (!unit) {
    return (
      <Screen>
        <ScreenHeader title="Урок" onBack={() => navigate('/course')} />
      </Screen>
    );
  }

  const p = unitProgress(unit, getCard);
  const { unlocked } = getCourse();
  const showTr = getSettings().translit === 'always';
  const next = UNITS.find((u) => u.id === unit.id + 1);
  const canOpenNext = unit.id === unlocked && p.allIntroduced && !!next?.ready && !p.gateMet;
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <Screen onPointerDown={unlockAudio}>
      <ScreenHeader title={`Урок ${unit.id}. ${unit.titleRu}`} onBack={() => navigate('/course')} />
      <Body>
        <Card>
          <Goal>{unit.goalRu}</Goal>
          <Meters>
            <Meter>
              <MeterValue>
                {p.introduced}/{p.total}
              </MeterValue>
              <MeterLabel>пройдено</MeterLabel>
            </Meter>
            <Meter>
              <MeterValue style={{ color: theme.colors.success }}>
                {p.passed}/{p.skeleton}
              </MeterValue>
              <MeterLabel>уверенно</MeterLabel>
            </Meter>
            <Meter>
              <MeterValue style={{ color: theme.colors.primary }}>
                {p.automatic}/{p.skeleton}
              </MeterValue>
              <MeterLabel>на автомате</MeterLabel>
            </Meter>
          </Meters>
          <Small style={{ marginTop: 12 }}>
            {p.gateMet
              ? 'Урок освоен: следующий открыт.'
              : `Следующий урок откроется, когда ${pct(GATE.passed)} схем идут уверенно и ${pct(GATE.automatic)} — на автомате.`}
          </Small>
        </Card>

        <SectionLabel>Идеи урока</SectionLabel>
        {unit.steps.map((s) =>
          s.kind === 'explain' ? (
            <Card key={s.id}>
              <Title>{s.titleRu}</Title>
              {s.bodyRu.map((t, i) => (
                <Para key={i}>{t}</Para>
              ))}
              {s.examples.map((e, i) => (
                <Example key={i}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Ka>{e.ka}</Ka>
                    <Small>
                      {showTr ? `${translit(e.ka)} · ` : ''}
                      {e.ru}
                    </Small>
                  </div>
                  <SpeakerButton audio={audioIdFor(e.ka)} />
                </Example>
              ))}
            </Card>
          ) : null,
        )}
      </Body>

      <Footer>
        {p.introduced > 0 && (
          <Pill
            kind="primary"
            size="lg"
            onClick={() => {
              unlockAudio();
              navigate('/session', { state: { mode: 'unit', unitId: unit.id } });
            }}
          >
            <Icon name="play" size={18} />
            Тренировать урок
          </Pill>
        )}
        {canOpenNext && (
          <Pill
            kind="ghost"
            onClick={() => {
              if (window.confirm('Открыть следующий урок, не дожидаясь автоматизма в этом?')) {
                setCourse({ unlocked: unit.id + 1 });
              }
            }}
          >
            Открыть следующий урок
          </Pill>
        )}
      </Footer>
    </Screen>
  );
}
