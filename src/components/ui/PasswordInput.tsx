import React, { FC, useState } from 'react';
import Icon from './Icon';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const PasswordInput: FC<PasswordInputProps> = ({ label, error, className, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="form-group password-input-wrapper">
            {label && <label>{label}</label>}
            <div className="input-with-icon">
                <input
                    {...props}
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input ${className || ''}`}
                />
                <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    tabIndex={-1}
                >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} width={20} height={20} />
                </button>
            </div>
            {error && <p className="error-text">{error}</p>}
        </div>
    );
};

export default PasswordInput;
