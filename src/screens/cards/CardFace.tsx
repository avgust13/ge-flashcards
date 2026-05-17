import styled from 'styled-components';
import { Icon } from '../../components/ui/Icon';
import { ImageSlot } from '../../components/ui/ImageSlot';
import type { Word } from '../../types';

interface Props {
  side: 'front' | 'back';
  word: Word;
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
`;

const Tag = styled.div<{ $back: boolean }>`
  font-size: 10px;
  font-weight: 900;
  color: ${({ $back, theme }) => ($back ? theme.colors.blue : theme.colors.primary)};
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

const RuSub = styled.div`
  font-family: ${({ theme }) => theme.fonts.ka};
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

export function CardFace({ side, word }: Props) {
  const back = side === 'back';
  return (
    <Face $back={back}>
      <TopRow>
        <Tag $back={back}>{back ? 'Russian' : 'Georgian'}</Tag>
        <SpeakerBtn
          aria-label="Pronounce"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="speaker" size={18} />
        </SpeakerBtn>
      </TopRow>

      <ImageSlot
        height={180}
        label={back ? word.ru : word.ka}
        accent={back ? '#D7E5FF' : '#FFD6B8'}
      />

      <Center>
        {!back ? (
          <>
            <Ka>{word.ka}</Ka>
            <Tr>/{word.tr}/</Tr>
          </>
        ) : (
          <>
            <Ru>{word.ru}</Ru>
            <RuSub>{word.ka} · /{word.tr}/</RuSub>
          </>
        )}
      </Center>

      <Hint>{back ? 'tap to flip back' : 'tap to reveal translation'}</Hint>
    </Face>
  );
}
