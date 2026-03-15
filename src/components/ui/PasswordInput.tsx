import React, { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { cn } from "@/lib/utils"

export interface PasswordInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, label, required, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false)

        return (
            <div className="form-group">
                {label && <label>{label}</label>}
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        className={cn("form-input", "pr-12", className)}
                        ref={ref}
                        required={required}
                        {...props}
                    />
                    <button
                        type="button"
                        className="password-toggle-btn"
                        style={{ top: '50%', transform: 'translateY(-50%)' }}
                        onClick={() => setShowPassword((prev) => !prev)}
                        tabIndex={-1}
                    >
                        {showPassword ? (
                            <EyeOff className="h-5 w-5" aria-hidden="true" />
                        ) : (
                            <Eye className="h-5 w-5" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                            {showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                        </span>
                    </button>
                </div>
            </div>
        )
    }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
