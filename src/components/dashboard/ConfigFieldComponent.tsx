import React from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

export interface ConfigFieldOption {
  label: string;
  value: string;
}

export interface ConfigField {
  key: string;
  label: string;
  description?: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  value: string | boolean | number;
  placeholder?: string;
  options?: ConfigFieldOption[];
  min?: number;
  max?: number;
}

interface ConfigFieldComponentProps {
  field: ConfigField;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}

export function ConfigFieldComponent({ field, onChange, disabled = false }: ConfigFieldComponentProps) {
  const handleChange = (value: any) => {
    if (field.type === 'boolean') {
      onChange(field.key, value === 'true' || value === true);
    } else if (field.type === 'number') {
      onChange(field.key, value === '' ? 0 : parseFloat(value));
    } else {
      onChange(field.key, value);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        {field.description && (
          <span className="text-xs text-gray-500">{field.description}</span>
        )}
      </div>

      {field.type === 'boolean' && (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={field.value as boolean}
            onCheckedChange={(checked) => handleChange(checked)}
            disabled={disabled}
            id={field.key}
          />
          <label htmlFor={field.key} className="text-sm text-gray-600 cursor-pointer">
            {field.value ? 'Habilitado' : 'Desabilitado'}
          </label>
        </div>
      )}

      {field.type === 'number' && (
        <Input
          type="number"
          value={field.value as number}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          min={field.min}
          max={field.max}
          step="0.01"
          className="w-full"
        />
      )}

      {field.type === 'string' && (
        <Input
          type="text"
          value={field.value as string}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className="w-full"
        />
      )}

      {field.type === 'select' && field.options && (
        <Select value={String(field.value)} onValueChange={handleChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
