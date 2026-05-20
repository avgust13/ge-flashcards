import styled from 'styled-components';
import { Icon } from '../../components/ui/Icon';

interface Props {
  options: string[];
  onTap: (ru: string) => void;
  onHint: () => void;
  solved: boolean;
  hint?: string;
}

const Card = styled.div`
  background: #fff;
  border-radius: 22px;
  padding: 14px;
  box-shadow: ${({ theme }) => theme.shadow};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const Label = styled.div`
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.inkMute};
  letter-spacing: 1.3px;
  text-transform: uppercase;
`;

const Hint = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.inkMute};
  margin-top: 6px;
`;

const HintBtn = styled.button`
  border: 1.5px solid ${({ theme }) => theme.colors.warn};
  background: ${({ theme }) => theme.colors.warnSoft};
  color: #9A6D00;
  border-radius: 999px;
  padding: 6px 12px;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
`;

const Tile = styled.button`
  aspect-ratio: 1;
  max-height: 80px;
  border: none;
  border-radius: 12px;
  background: #FAF5EA;
  color: ${({ theme }) => theme.colors.ink};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 900;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 2px 0 ${({ theme }) => theme.colors.line};
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export function TileKeyboard({ options, onTap, onHint, solved, hint }: Props) {
  return (
    <Card>
      <Header>
        <div>
          <Label>Pick the Russian letter</Label>
          {hint && <Hint>{hint}</Hint>}
        </div>
        <HintBtn onClick={onHint} disabled={solved}>
          <Icon name="bulb" size={14} stroke={2.2} />
          Hint
        </HintBtn>
      </Header>
      <Grid>
        {options.map((opt) => (
          <Tile key={opt} onClick={() => onTap(opt)} disabled={solved}>
            {opt}
          </Tile>
        ))}
      </Grid>
    </Card>
  );
}
