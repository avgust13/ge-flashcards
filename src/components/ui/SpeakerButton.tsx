import styled from 'styled-components';
import { playClip } from '../../audio/player';
import { Icon } from './Icon';

interface Props {
  /** Generated clip id; the button is disabled when there is none. */
  audio: string | null | undefined;
  size?: number;
  tone?: 'soft' | 'solid';
}

const Btn = styled.button<{ $size: number; $solid: boolean }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  border: none;
  flex-shrink: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ $solid, theme }) => ($solid ? theme.colors.blue : '#F3EBD8')};
  color: ${({ $solid, theme }) => ($solid ? '#fff' : theme.colors.inkSoft)};
  box-shadow: ${({ $solid }) => ($solid ? '0 3px 0 #2563C9' : 'none')};

  &:disabled {
    opacity: 0.35;
    cursor: default;
    box-shadow: none;
  }
`;

export function SpeakerButton({ audio, size = 36, tone = 'soft' }: Props) {
  return (
    <Btn
      type="button"
      $size={size}
      $solid={tone === 'solid'}
      disabled={!audio}
      aria-label="Прослушать"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        void playClip(audio);
      }}
    >
      <Icon name="speaker" size={Math.round(size * 0.5)} stroke={2.2} />
    </Btn>
  );
}
