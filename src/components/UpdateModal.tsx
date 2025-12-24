import React from 'react';

interface UpdateModalProps {
  isOpen: boolean;
  forceUpdate: boolean;
  updateMessage: string;
  releaseNotes: string;
  storeUrl: string;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  forceUpdate,
  updateMessage,
  releaseNotes,
  storeUrl,
  onClose
}) => {
  if (!isOpen) return null;

  const handleUpdate = () => {
    window.open(storeUrl, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: 'clamp(1rem, 5vw, 1.25rem)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 'clamp(1rem, 5vw, 1.25rem)',
        padding: 'clamp(1.25rem, 5vw, 1.875rem)',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(1rem, 4vw, 1.25rem)' }}>
          <div style={{ fontSize: 'clamp(3rem, 10vw, 3.75rem)', marginBottom: 'clamp(0.5rem, 2vw, 0.625rem)' }}>🔄</div>
          <h2 style={{ margin: '0 0 clamp(0.5rem, 2vw, 0.625rem) 0', color: '#333', fontSize: 'clamp(1.25rem, 5vw, 1.5rem)' }}>
            {forceUpdate ? 'Actualización Requerida' : 'Nueva Versión Disponible'}
          </h2>
          <p style={{ color: '#666', fontSize: 'clamp(0.813rem, 3vw, 0.875rem)', margin: 0 }}>
            {updateMessage}
          </p>
        </div>

        {releaseNotes && (
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: 'clamp(0.75rem, 3vw, 0.938rem)',
            borderRadius: 'clamp(0.5rem, 2vw, 0.625rem)',
            marginBottom: 'clamp(1rem, 4vw, 1.25rem)'
          }}>
            <p style={{ margin: 0, fontSize: 'clamp(0.75rem, 3vw, 0.813rem)', color: '#666' }}>
              {releaseNotes}
            </p>
          </div>
        )}

        <button
          onClick={handleUpdate}
          style={{
            width: '100%',
            padding: 'clamp(0.75rem, 3vw, 0.938rem)',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: 'clamp(0.5rem, 2vw, 0.625rem)',
            fontSize: 'clamp(0.875rem, 3vw, 1rem)',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: forceUpdate ? '0' : 'clamp(0.5rem, 2vw, 0.625rem)'
          }}
        >
          Actualizar Ahora
        </button>

        {!forceUpdate && (
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: 'clamp(0.75rem, 3vw, 0.938rem)',
              backgroundColor: '#e0e0e0',
              color: '#666',
              border: 'none',
              borderRadius: 'clamp(0.5rem, 2vw, 0.625rem)',
              fontSize: 'clamp(0.875rem, 3vw, 1rem)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Más Tarde
          </button>
        )}
      </div>
    </div>
  );
};
