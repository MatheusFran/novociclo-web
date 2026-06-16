import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfigFieldComponent, type ConfigField } from './ConfigFieldComponent';

export interface ConfigSection {
  id: string;
  title: string;
  description?: string;
  fields: ConfigField[];
}

interface ConfigSectionComponentProps {
  section: ConfigSection;
  onFieldChange: (key: string, value: any) => void;
  disabled?: boolean;
}

export function ConfigSectionComponent({ section, onFieldChange, disabled = false }: ConfigSectionComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{section.title}</CardTitle>
        {section.description && (
          <CardDescription>{section.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {section.fields.map((field) => (
          <ConfigFieldComponent
            key={field.key}
            field={field}
            onChange={onFieldChange}
            disabled={disabled}
          />
        ))}
      </CardContent>
    </Card>
  );
}
