import styled from 'styled-components';
import { playBase64 } from '../../audio/player';
import { Icon } from '../../components/ui/Icon';
import { ImageSlot } from '../../components/ui/ImageSlot';
import { trOnReveal, trVisible } from '../../content/reading';
import type { Word } from '../../types';

export type CardDir = 'ka-ru' | 'ru-ka';

interface Props {
  side: 'front' | 'back';
  word: Word;
  dir?: CardDir;
}

const Face = styled.div<{ $back: boolean }>`
  position: absolute;
  inset: 0;
  border-radius: 28px;
  background: #fff;
  box-shadow: ${({ theme }) => theme.shadow};
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  backface-visibility: hidden;
  transform: ${({ $back }) => ($back ? 'rotateY(180deg)' : 'none')};
  border: 1px solid ${({ theme }) => theme.colors.line};
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
`;

const Tag = styled.div<{ $ka: boolean }>`
  font-size: 10px;
  font-weight: 900;
  color: ${({ $ka, theme }) => ($ka ? theme.colors.primary : theme.colors.blue)};
  letter-spacing: 1.5px;
  text-transform: uppercase;
`;

const SpeakerBtn = styled.button`
  border: none;
  background: #F3EBD8;
  cursor: pointer;
  width: 34px;
  height: 34px;
  border-radius: 17px;
  color: ${({ theme }) => theme.colors.inkSoft};
  display: flex;
  align-items: center;
  justify-content: center;
`;

/** Takes the picture's place on a question side, where a picture would give the answer away. */
const Blank = styled.div`
  height: 180px;
  border-radius: 18px;
  background: repeating-linear-gradient(135deg, #FAF5EA 0 12px, #F6EEDC 12px 24px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.inkMute};
  font-size: 44px;
  font-weight: 900;
`;

const Center = styled.div`
  text-align: center;
  margin-top: auto;
`;

const Ka = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 44px;
  color: ${({ theme }) => theme.colors.ink};
  line-height: 1.1;
`;

const Tr = styled.div`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 15px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-style: italic;
  margin-top: 4px;
`;

const Ru = styled.div`
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 900;
  font-size: 36px;
  color: ${({ theme }) => theme.colors.ink};
  line-height: 1.1;
`;

const Sub = styled.div<{ $ka?: boolean }>`
  font-family: ${({ $ka, theme }) => ($ka ? theme.fonts.ka : theme.fonts.ui)};
  font-size: 16px;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 6px;
`;

const Hint = styled.div`
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.inkMute};
  letter-spacing: 0.4px;
`;

/**
 * One side of a word card. The question side never gives the answer away:
 * a Georgian question shows no picture, and a Russian question shows no
 * Georgian text and has no audio button.
 */
export function CardFace({ side, word, dir = 'ka-ru' }: Props) {
  const back = side === 'back';
  // Which language this side is in.
  const georgian = back !== (dir === 'ka-ru');
  const showTr = back ? trOnReveal() : trVisible(word.ka);

  return (
    <Face $back={back}>
      <TopRow>
        <Tag $ka={georgian}>{georgian ? 'Грузинский' : 'Русский'}</Tag>
        {(georgian || back) && (
          <SpeakerBtn
            aria-label="Прослушать"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              playBase64(word.audio);
            }}
          >
            <Icon name="speaker" size={18} />
          </SpeakerBtn>
        )}
      </TopRow>

      {georgian && !back ? (
        <Blank aria-hidden="true">?</Blank>
      ) : (
        <ImageSlot src={word.image} height={180} label={word.ru} accent={georgian ? '#FFD6B8' : '#D7E5FF'} />
      )}

      <Center>
        {georgian ? (
          <>
            <Ka>{word.ka}</Ka>
            {showTr && <Tr>/{word.tr}/</Tr>}
            {back && <Sub>{word.ru}</Sub>}
          </>
        ) : (
          <>
            <Ru>{word.ru}</Ru>
            {back && (
              <Sub $ka>
                {word.ka}
                {showTr ? ` · /${word.tr}/` : ''}
              </Sub>
            )}
          </>
        )}
      </Center>

      <Hint>{back ? 'нажми, чтобы перевернуть' : 'вспомни, потом нажми, чтобы проверить'}</Hint>
    </Face>
  );
}
