import styled from 'styled-components';
import { Icon } from '../../components/ui/Icon';

interface Props {
  ru: string;
  audio?: string;
  solved: boolean;
}

const Box = styled.div<{ $solved: boolean }>`
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 14px;
  background: ${({ $solved, theme }) => ($solved ? theme.colors.successSoft : '#FAF5EA')};
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.25s;
`;

const Tag = styled.div<{ $solved: boolean }>`
  font-size: 11px;
  font-weight: 800;
  color: ${({ $solved, theme }) => ($solved ? theme.colors.success : theme.colors.inkMute)};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Word = styled.div<{ $solved: boolean }>`
  font-size: 22px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ink};
  filter: ${({ $solved }) => ($solved ? 'none' : 'blur(6px)')};
  user-select: ${({ $solved }) => ($solved ? 'auto' : 'none')};
  transition: filter 0.3s;
`;

const SpeakerBtn = styled.button<{ $solved: boolean }>`
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ $solved, theme }) =>
    $solved ? theme.colors.success : theme.colors.inkSoft};
`;

export function TranslationCard({ ru, audio, solved }: Props) {
  return (
    <Box $solved={solved}>
      <div>
        <Tag $solved={solved}>Translation</Tag>
        <Word $solved={solved}>{ru}</Word>
      </div>
      <SpeakerBtn
        $solved={solved}
        aria-label="Pronounce"
        disabled={!solved}
        onClick={() => {
          if (solved && audio) new Audio(`data:audio/mpeg;base64,${audio}`).play();
        }}
      >
        <Icon name="speaker" size={22} />
      </SpeakerBtn>
    </Box>
  );
}
