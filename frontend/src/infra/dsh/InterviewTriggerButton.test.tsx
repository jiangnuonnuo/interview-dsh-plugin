import { render, screen, fireEvent } from '@testing-library/react';
import { InterviewTriggerButton } from './InterviewTriggerButton';

describe('InterviewTriggerButton', () => {
  it('exposes a 面试 control', () => {
    const onOpen = jest.fn();
    render(<InterviewTriggerButton onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: '面试' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
