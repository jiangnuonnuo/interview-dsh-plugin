import styles from './InterviewTriggerButton.module.css';

export const InterviewTriggerButton = ({ onOpen }: { onOpen: () => void }) => {
  return (
    <button type="button" className={styles.button} onClick={() => onOpen()} title="打开模拟面试入口">
      面试
    </button>
  );
};
