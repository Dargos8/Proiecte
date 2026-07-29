// citizen/components/Loader.jsx
import React from 'react';
import styles from './Loader.module.css';

const Loader = ({ message = "Se încarcă..." }) => {
  return (
    <div className={styles.loaderWrapper} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.loadingText}>{message}</p>
      {/* Element ascuns vizual, dar citit de screen readers pentru accesibilitate maximă */}
      <span className="sr-only">Vă rugăm să așteptați.</span>
    </div>
  );
};

export default Loader;