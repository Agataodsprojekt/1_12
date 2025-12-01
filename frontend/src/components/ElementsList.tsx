import { IFCElement } from '../types/ifc';

interface ElementsListProps {
  elements: IFCElement[];
}

export function ElementsList({ elements }: ElementsListProps) {
  const displayCount = 10;
  const displayElements = elements.slice(0, displayCount);
  const remainingCount = elements.length - displayCount;

  return (
    <details className="mt-4">
      <summary className="cursor-pointer font-medium text-sm hover:text-primary">
        Szczegóły elementów
      </summary>
      <ul className="mt-2 space-y-1 text-sm">
        {displayElements.map((element, index) => (
          <li key={index} className="text-muted-foreground">
            <strong className="text-foreground">{element.type_name || 'Unknown'}</strong>
            {element.name && ` - ${element.name}`}
          </li>
        ))}
        {remainingCount > 0 && (
          <li className="text-muted-foreground italic">
            ... i {remainingCount} więcej
          </li>
        )}
      </ul>
    </details>
  );
}

