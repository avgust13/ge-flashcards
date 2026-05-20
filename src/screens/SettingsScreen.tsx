import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Icon } from '../components/ui/Icon';
import { Pill } from '../components/ui/Pill';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { clearStats } from '../data/stats';
import { useWordsLoad } from '../state/WordsContext';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.ink};
`;

const Body = styled.div`
  padding: 8px 20px 20px;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 18px;
  box-shadow: ${({ theme }) => theme.shadow};
  border: 1px solid ${({ theme }) => theme.colors.line};
  padding: 6px 16px;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;

  @media (max-width: 520px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const Meta = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
`;

const IconBadge = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.blueSoft};
  color: ${({ theme }) => theme.colors.blue};
  flex: 0 0 auto;
`;

const DangerIconBadge = styled(IconBadge)`
  background: ${({ theme }) => theme.colors.dangerSoft};
  color: ${({ theme }) => theme.colors.danger};
`;

const RowDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.line};
  margin: 4px 0;
`;

const Title = styled.div`
  font-weight: 800;
  font-size: 16px;
`;

const Desc = styled.div`
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-size: 14px;
  line-height: 1.45;
`;

const Action = styled.div`
  flex: 0 0 auto;

  @media (max-width: 520px) {
    width: 100%;

    button {
      width: 100%;
    }
  }
`;

const Hint = styled.div`
  margin-top: 10px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-size: 13px;
`;

const Message = styled.div<{ $isError: boolean }>`
  margin-top: 8px;
  font-size: 13px;
  color: ${({ theme, $isError }) => ($isError ? theme.colors.danger : theme.colors.success)};
`;

const Notice = styled.div`
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.line};
  color: ${({ theme }) => theme.colors.inkSoft};
  font-size: 12px;
  line-height: 1.45;
`;

const Footer = styled.footer`
  margin-top: auto;
  padding: 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-size: 13px;
`;

const FooterLink = styled.a`
  width: 40px;
  height: 40px;
  margin: 8px auto 0;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.inkSoft};
  text-decoration: none;
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: #fff;
  box-shadow: ${({ theme }) => theme.shadow};
  transition: color .12s ease, transform .12s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-1px);
  }
`;

export function SettingsScreen() {
  const navigate = useNavigate();
  const { reloadWords, reloading, error } = useWordsLoad();
  const [status, setStatus] = useState('');
  const [resetStatus, setResetStatus] = useState('');

  const onRedownload = async () => {
    setStatus('');
    try {
      await reloadWords();
      setStatus('Words library is up to date.');
    } catch {
      setStatus('');
    }
  };

  const onResetProgress = async () => {
    if (!window.confirm('Reset all learning progress? This cannot be undone.')) return;
    setResetStatus('');
    clearStats();
    try {
      await reloadWords();
      setResetStatus('Progress has been reset.');
    } catch {
      setResetStatus('Progress reset locally. Reload the app to refresh the library.');
    }
  };

  const statusText = error ?? status;
  const isError = Boolean(error);

  return (
    <Screen>
      <ScreenHeader title="Settings" onBack={() => navigate('/')} />
      <Body>
        <Card>
          <SettingRow>
            <Meta>
              <IconBadge>
                <Icon name="refresh" size={20} />
              </IconBadge>
              <div>
                <Title>Data</Title>
                <Desc>
                  Update your words library to get the latest improvements and fixes.
                </Desc>
                {reloading && <Hint>Please wait while we refresh your words library.</Hint>}
                {statusText && <Message $isError={isError}>{statusText}</Message>}
              </div>
            </Meta>
            <Action>
              <Pill kind="primary" onClick={onRedownload} disabled={reloading}>
                {reloading ? 'Updating...' : 'Update'}
              </Pill>
            </Action>
          </SettingRow>
          <RowDivider />
          <SettingRow>
            <Meta>
              <DangerIconBadge>
                <Icon name="close" size={20} />
              </DangerIconBadge>
              <div>
                <Title>Progress</Title>
                <Desc>
                  Reset your learning stats. All words will start from zero.
                </Desc>
                {resetStatus && <Message $isError={false}>{resetStatus}</Message>}
              </div>
            </Meta>
            <Action>
              <Pill kind="ghost" onClick={onResetProgress} disabled={reloading}>
                Reset
              </Pill>
            </Action>
          </SettingRow>
          <Notice>
            We use cookies to save your learning progress. By using this app, you automatically
            agree to the terms.
          </Notice>
        </Card>
      </Body>
      <Footer>
        This is an open source GitHub project.
        <br />
        <FooterLink
          href="https://github.com/avgust13/ge-flashcards"
          target="_blank"
          rel="noreferrer"
          aria-label="Open project on GitHub"
        >
          <Icon name="github" size={20} />
        </FooterLink>
      </Footer>
    </Screen>
  );
}
