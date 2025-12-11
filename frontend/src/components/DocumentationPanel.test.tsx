import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentationPanel } from "./DocumentationPanel";
import { IFCElement } from "../types/ifc";

describe("DocumentationPanel", () => {
  const mockElements: IFCElement[] = [
    {
      type_name: "IfcWall",
      global_id: "3x4y5z",
      name: "Wall 1",
      position: [0, 0, 0],
      properties: {
        Material: "Concrete",
        Thickness: 200,
      },
    },
    {
      type_name: "IfcColumn",
      global_id: "6x7y8z",
      name: "Column A",
      position: [5, 0, 3],
      properties: {
        Material: "Steel",
        Height: 3000,
      },
    },
    {
      type_name: "IfcBeam",
      global_id: "9x0y1z",
      name: "Beam B",
      position: [10, 2, 5],
    },
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render documentation panel with header", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    expect(screen.getByText("Dokumentacja Projektu")).toBeInTheDocument();
    expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
  });

  it("should display statistics", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    expect(screen.getByText("Łączna liczba")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // totalElements
    expect(screen.getByText("Typy elementów")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // uniqueTypes
  });

  it("should display list of elements", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    expect(screen.getByText("IfcWall")).toBeInTheDocument();
    expect(screen.getByText("Wall 1")).toBeInTheDocument();
    expect(screen.getByText("3x4y5z")).toBeInTheDocument();

    expect(screen.getByText("IfcColumn")).toBeInTheDocument();
    expect(screen.getByText("Column A")).toBeInTheDocument();
    expect(screen.getByText("6x7y8z")).toBeInTheDocument();
  });

  it("should filter elements by query", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    const filterInput = screen.getByPlaceholderText(/filtruj/i);
    fireEvent.change(filterInput, { target: { value: "Wall" } });

    expect(screen.getByText("IfcWall")).toBeInTheDocument();
    expect(screen.getByText("Wall 1")).toBeInTheDocument();
    expect(screen.queryByText("IfcColumn")).not.toBeInTheDocument();
    expect(screen.queryByText("IfcBeam")).not.toBeInTheDocument();
  });

  it("should show filtered count when filter is active", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    const filterInput = screen.getByPlaceholderText(/filtruj/i);
    fireEvent.change(filterInput, { target: { value: "Column" } });

    expect(screen.getByText(/Znaleziono: 1 z 3 elementów/i)).toBeInTheDocument();
  });

  it("should sort elements by type when clicking type header", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    const typeHeader = screen.getByText("Typ");
    fireEvent.click(typeHeader);

    // Elements should be sorted (ascending by default)
    const elements = screen.getAllByText(/Ifc/);
    expect(elements[0]).toHaveTextContent("IfcBeam");
  });

  it("should toggle sort direction when clicking same header twice", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    const typeHeader = screen.getByText("Typ");
    fireEvent.click(typeHeader); // First click - ascending
    fireEvent.click(typeHeader); // Second click - descending

    // Should be sorted descending now
    const elements = screen.getAllByText(/Ifc/);
    expect(elements[0]).toHaveTextContent("IfcWall");
  });

  it("should expand element to show details", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    // Find expand button (ChevronRight icon)
    const expandButtons = screen.getAllByRole("button");
    const expandButton = expandButtons.find((btn) =>
      btn.querySelector('svg')
    );

    if (expandButton) {
      fireEvent.click(expandButton);

      // Check if details are shown
      expect(screen.getByText("Material:")).toBeInTheDocument();
      expect(screen.getByText("Concrete")).toBeInTheDocument();
    }
  });

  it("should call onClose when close button is clicked", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should display empty state when no elements match filter", () => {
    render(<DocumentationPanel elements={mockElements} onClose={mockOnClose} />);

    const filterInput = screen.getByPlaceholderText(/filtruj/i);
    fireEvent.change(filterInput, { target: { value: "NonExistent" } });

    expect(screen.getByText(/Nie znaleziono elementów pasujących do filtra/i)).toBeInTheDocument();
  });

  it("should display empty state when elements array is empty", () => {
    render(<DocumentationPanel elements={[]} onClose={mockOnClose} />);

    expect(screen.getByText(/Brak elementów do wyświetlenia/i)).toBeInTheDocument();
  });

  it("should handle elements without name", () => {
    const elementsWithoutName: IFCElement[] = [
      {
        type_name: "IfcWall",
        global_id: "123",
      },
    ];

    render(<DocumentationPanel elements={elementsWithoutName} onClose={mockOnClose} />);

    expect(screen.getByText("Unnamed")).toBeInTheDocument();
  });

  it("should handle elements without global_id", () => {
    const elementsWithoutId: IFCElement[] = [
      {
        type_name: "IfcWall",
        name: "Wall 1",
      },
    ];

    render(<DocumentationPanel elements={elementsWithoutId} onClose={mockOnClose} />);

    // Should still render the element
    expect(screen.getByText("IfcWall")).toBeInTheDocument();
    expect(screen.getByText("Wall 1")).toBeInTheDocument();
  });
});

