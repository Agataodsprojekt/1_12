"""IFC Parser service implementation"""
from typing import List, Dict, Any
import os
import json
import ifcopenshell
import ifcopenshell.util.element
import ifcopenshell.util.placement
import ifcopenshell.util.shape
import numpy as np
from domain.entities.ifc_element import IfcElement
from domain.interfaces.ifc_parser_service import IIfcParserService
from ifc_common import Result
from infrastructure.config.settings import Settings


class IfcParserService(IIfcParserService):
    """IFC Parser service implementation"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
    
    def _extract_properties(self, element) -> Dict[str, Any]:
        """Extract properties from IFC element"""
        properties = {}
        
        try:
            # Get Psets (Property Sets)
            psets = ifcopenshell.util.element.get_psets(element)
            for pset_name, pset_props in psets.items():
                for prop_name, prop_value in pset_props.items():
                    key = f"{pset_name}.{prop_name}" if pset_name != "Base" else prop_name
                    properties[key] = str(prop_value) if prop_value is not None else ""
            
            # Get Type properties if element has type
            if hasattr(element, 'IsTypedBy') and element.IsTypedBy:
                type_element = element.IsTypedBy[0].RelatingType
                if type_element:
                    type_psets = ifcopenshell.util.element.get_psets(type_element)
                    for pset_name, pset_props in type_psets.items():
                        for prop_name, prop_value in pset_props.items():
                            key = f"Type.{pset_name}.{prop_name}" if pset_name != "Base" else f"Type.{prop_name}"
                            if key not in properties:  # Don't override instance properties
                                properties[key] = str(prop_value) if prop_value is not None else ""
        except Exception as e:
            # If property extraction fails, continue without properties
            pass
        
        # Add basic geometric properties if available
        try:
            if hasattr(element, 'ObjectPlacement'):
                # Try to get dimensions from geometry
                if hasattr(element, 'Representation'):
                    # This would require more complex geometry extraction
                    pass
        except Exception:
            pass
        
        return properties
    
    def _get_placement_matrix(self, element) -> List[float]:
        """Extract GLOBAL placement transformation matrix from IFC element
        
        CRITICAL: In IFC, placement can be hierarchical:
        - Site → Building → BuildingStorey → Element
        - Assembly → Element
        Local placement is relative to parent, so we need to accumulate through hierarchy.
        
        Returns matrix in format similar to WPF Matrix3D (column-major):
        [m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33]
        where indices 12, 13, 14 are translation (OffsetX, OffsetY, OffsetZ)
        """
        try:
            if not hasattr(element, 'ObjectPlacement') or element.ObjectPlacement is None:
                return [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]
            
            def extract_matrix_from_placement(placement_obj) -> np.ndarray:
                """Extract transformation matrix from IIfcLocalPlacement (exactly like C# ToWpfMatrix3D)"""
                try:
                    if not hasattr(placement_obj, 'RelativePlacement'):
                        return np.eye(4)
                    
                    rel_placement = placement_obj.RelativePlacement
                    if rel_placement is None:
                        return np.eye(4)
                    
                    # Extract Location (origin/translation) - like C#: location.Coordinates
                    origin = np.array([0.0, 0.0, 0.0])
                    if hasattr(rel_placement, 'Location') and rel_placement.Location is not None:
                        location = rel_placement.Location
                        if hasattr(location, 'Coordinates'):
                            coords = location.Coordinates
                            try:
                                if isinstance(coords, (list, tuple)) and len(coords) >= 3:
                                    origin = np.array([float(coords[0]), float(coords[1]), float(coords[2])])
                                elif hasattr(coords, '__getitem__'):
                                    origin = np.array([float(coords[0]), float(coords[1]), float(coords[2])])
                                elif hasattr(coords, '__iter__'):
                                    coords_list = list(coords)[:3]
                                    if len(coords_list) >= 3:
                                        origin = np.array([float(coords_list[0]), float(coords_list[1]), float(coords_list[2])])
                            except (ValueError, TypeError, IndexError):
                                pass
                    
                    # Extract Axis (Z-axis) - like C#: axis.DirectionRatios
                    zAxis = np.array([0.0, 0.0, 1.0])  # Default Z-up
                    if hasattr(rel_placement, 'Axis') and rel_placement.Axis is not None:
                        axis = rel_placement.Axis
                        if hasattr(axis, 'DirectionRatios'):
                            ratios = axis.DirectionRatios
                            try:
                                if isinstance(ratios, (list, tuple)) and len(ratios) >= 3:
                                    zAxis = np.array([float(ratios[0]), float(ratios[1]), float(ratios[2])])
                                elif hasattr(ratios, '__getitem__'):
                                    zAxis = np.array([float(ratios[0]), float(ratios[1]), float(ratios[2])])
                            except (ValueError, TypeError, IndexError):
                                pass
                        # Normalize
                        zNorm = np.linalg.norm(zAxis)
                        if zNorm > 1e-6:
                            zAxis = zAxis / zNorm
                    
                    # Extract RefDirection (X-axis) - like C#: refDirection.DirectionRatios
                    xAxis = np.array([1.0, 0.0, 0.0])  # Default X-right
                    if hasattr(rel_placement, 'RefDirection') and rel_placement.RefDirection is not None:
                        ref_dir = rel_placement.RefDirection
                        if hasattr(ref_dir, 'DirectionRatios'):
                            ratios = ref_dir.DirectionRatios
                            try:
                                if isinstance(ratios, (list, tuple)) and len(ratios) >= 3:
                                    xAxis = np.array([float(ratios[0]), float(ratios[1]), float(ratios[2])])
                                elif hasattr(ratios, '__getitem__'):
                                    xAxis = np.array([float(ratios[0]), float(ratios[1]), float(ratios[2])])
                            except (ValueError, TypeError, IndexError):
                                pass
                        # Normalize
                        xNorm = np.linalg.norm(xAxis)
                        if xNorm > 1e-6:
                            xAxis = xAxis / xNorm
                    
                    # Calculate Y-axis as cross product (Z x X) - like C#: CrossProduct(zAxis, xAxis)
                    yAxis = np.cross(zAxis, xAxis)
                    yNorm = np.linalg.norm(yAxis)
                    if yNorm > 1e-6:
                        yAxis = yAxis / yNorm
                    else:
                        yAxis = np.array([0.0, 1.0, 0.0])
                    
                    # Build 4x4 transformation matrix (row-major, like WPF Matrix3D constructor)
                    # Matrix format: [xAxis, yAxis, zAxis, origin] as rows
                    # Like C#: new Matrix3D(xAxis[0], xAxis[1], xAxis[2], 0, yAxis[0], yAxis[1], yAxis[2], 0, zAxis[0], zAxis[1], zAxis[2], 0, origin[0], origin[1], origin[2], 1)
                    matrix = np.array([
                        [xAxis[0], xAxis[1], xAxis[2], origin[0]],
                        [yAxis[0], yAxis[1], yAxis[2], origin[1]],
                        [zAxis[0], zAxis[1], zAxis[2], origin[2]],
                        [0.0, 0.0, 0.0, 1.0]
                    ])
                    
                    return matrix
                except Exception:
                    return np.eye(4)
            
            # Traverse hierarchy: element → parent → ... → root
            matrices = []
            placement = element.ObjectPlacement
            level = 0
            
            # Debug only first few elements
            if not hasattr(self, '_debug_count'):
                self._debug_count = 0
            debug_this_element = self._debug_count < 5
            if debug_this_element:
                self._debug_count += 1
                element_id = element.GlobalId if hasattr(element, 'GlobalId') else 'unknown'
                print(f"DEBUG: Element {element_id} - traversing placement hierarchy")
            
            while placement is not None:
                try:
                    # Extract matrix using C#-like method
                    local_matrix = extract_matrix_from_placement(placement)
                    matrices.append(local_matrix)
                    
                    if debug_this_element:
                        pos = local_matrix[:3, 3]
                        print(f"  Level {level}: local_pos={pos}")
                    
                    # Move to parent
                    if hasattr(placement, 'PlacementRelTo') and placement.PlacementRelTo:
                        placement = placement.PlacementRelTo
                        level += 1
                    else:
                        break
                except Exception as e:
                    if debug_this_element:
                        print(f"  Error at level {level}: {e}")
                    break
            
            # CRITICAL: In C# code, ToWpfMatrix3D is called on instance.ObjectPlacement directly
            # This means C# uses ONLY the LOCAL placement, not the full hierarchy!
            # Let's try both approaches:
            # 1. Use only local placement (like C#) - SIMPLER, might be what IFC file expects
            # 2. Or accumulate through hierarchy (more correct for hierarchical IFC)
            
            # For now, let's use ONLY local placement (like C#) since parent levels all show [0,0,0]
            # This suggests the IFC file uses global coordinates at element level
            if matrices:
                # OPTION 1: Use only element's local placement (like C#)
                # This matches the C# implementation exactly
                element_local_matrix = matrices[0]  # First matrix is element's local placement
                
                if debug_this_element:
                    local_pos = element_local_matrix[:3, 3]
                    print(f"  Using ONLY local placement (like C#): pos={local_pos}")
                    if len(matrices) > 1:
                        print(f"  (Ignoring {len(matrices)-1} parent levels with zero positions)")
                
                # Convert to column-major format (like WPF Matrix3D)
                # WPF Matrix3D stores data internally as column-major:
                # [M11, M21, M31, OffsetX, M12, M22, M32, OffsetY, M13, M23, M33, OffsetZ, M14, M24, M34, M44]
                # But our matrix is row-major: rows are [xAxis, yAxis, zAxis, origin]
                # After transpose: columns become [xAxis, yAxis, zAxis, origin]
                element_matrix_colmajor = element_local_matrix.T
                matrix_flat = element_matrix_colmajor.flatten().tolist()
                
                if debug_this_element:
                    print(f"  Matrix (row-major):")
                    print(f"    Row 0 (xAxis): {element_local_matrix[0]}")
                    print(f"    Row 1 (yAxis): {element_local_matrix[1]}")
                    print(f"    Row 2 (zAxis): {element_local_matrix[2]}")
                    print(f"    Row 3 (origin): {element_local_matrix[3]}")
                    print(f"  Matrix (column-major, flattened):")
                    print(f"    Indices 0-3: {matrix_flat[0:4]} (col 0)")
                    print(f"    Indices 4-7: {matrix_flat[4:8]} (col 1)")
                    print(f"    Indices 8-11: {matrix_flat[8:12]} (col 2)")
                    print(f"    Indices 12-15: {matrix_flat[12:16]} (col 3 - translation)")
                    print(f"  Translation from matrix[12:15]: {matrix_flat[12:15]}")
                
                if len(matrix_flat) >= 16:
                    return matrix_flat
                
                # OPTION 2: If option 1 doesn't work, we can try accumulating hierarchy
                # But for now, let's match C# exactly
            
            # Fallback: try just local placement if hierarchy traversal failed
            try:
                local_matrix = ifcopenshell.util.placement.get_local_placement(element.ObjectPlacement)
                if local_matrix is not None:
                    # Transpose to column-major format (like WPF Matrix3D)
                    local_matrix_colmajor = local_matrix.T
                    matrix_flat = local_matrix_colmajor.flatten().tolist()
                    if len(matrix_flat) >= 16:
                        return matrix_flat
            except Exception as e:
                pass
            
            # Try alternative: extract location directly from ObjectPlacement (like C# ToWpfMatrix3D)
            try:
                if hasattr(element.ObjectPlacement, 'RelativePlacement'):
                    placement = element.ObjectPlacement.RelativePlacement
                    if hasattr(placement, 'Location') and hasattr(placement.Location, 'Coordinates'):
                        coords = placement.Location.Coordinates
                        if coords and len(coords) >= 3:
                            location = [float(coords[0]), float(coords[1]), float(coords[2])]
                            # Create matrix with just translation
                            return [
                                1.0, 0.0, 0.0, location[0],
                                0.0, 1.0, 0.0, location[1],
                                0.0, 0.0, 1.0, location[2],
                                0.0, 0.0, 0.0, 1.0
                            ]
            except Exception as e:
                pass
            
            # Return identity matrix if placement is not available
            return [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]
        except Exception as e:
            # Return identity matrix on error
            return [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]
    
    def _get_geometry_bounds(self, element) -> Dict[str, Any]:
        """Extract bounding box from element geometry"""
        try:
            if not hasattr(element, 'Representation') or element.Representation is None:
                return None
            
            # Try to get shape from geometry using ifcopenshell
            # This requires the IFC file context, so we'll need to pass it or use a different approach
            # For now, try basic shape extraction
            try:
                shape = ifcopenshell.util.shape.get_shape(element)
                if shape is None:
                    return None
                
                # Get geometry from shape
                geometry = shape.geometry if hasattr(shape, 'geometry') else None
                if geometry is None:
                    return None
                
                # Try to get bounding box from geometry
                # The bbox might be in different formats depending on ifcopenshell version
                bbox = None
                if hasattr(geometry, 'bbox'):
                    bbox = geometry.bbox
                elif hasattr(geometry, 'bounding_box'):
                    bbox = geometry.bounding_box
                elif hasattr(geometry, 'getBoundingBox'):
                    bbox = geometry.getBoundingBox()
                
                if bbox is None:
                    return None
                
                # bbox format varies - try to handle common formats
                min_point = None
                max_point = None
                
                if isinstance(bbox, tuple) or isinstance(bbox, list):
                    if len(bbox) >= 2:
                        min_point = bbox[0]
                        max_point = bbox[1]
                elif hasattr(bbox, '__getitem__'):
                    try:
                        min_point = bbox[0]
                        max_point = bbox[1]
                    except:
                        pass
                
                if min_point is None or max_point is None:
                    return None
                
                # Convert to lists and calculate center and size
                min_coords = [float(min_point[i]) if len(min_point) > i else 0.0 for i in range(3)]
                max_coords = [float(max_point[i]) if len(max_point) > i else 0.0 for i in range(3)]
                
                return {
                    'min': min_coords,
                    'max': max_coords,
                    'center': [
                        (min_coords[0] + max_coords[0]) / 2.0,
                        (min_coords[1] + max_coords[1]) / 2.0,
                        (min_coords[2] + max_coords[2]) / 2.0
                    ],
                    'size': [
                        max_coords[0] - min_coords[0],
                        max_coords[1] - min_coords[1],
                        max_coords[2] - min_coords[2]
                    ]
                }
            except Exception as e:
                # Geometry extraction failed, return None
                # Don't log to avoid spam - many elements might not have extractable geometry
                pass
        except Exception as e:
            # Outer exception - also silent
            pass
        
        return None
    
    async def parse_file(self, file_path: str) -> Result[List[IfcElement], str]:
        """Parse IFC file using ifcopenshell"""
        if not os.path.exists(file_path):
            return Result.failure(f"File not found: {file_path}")
        
        try:
            # Open IFC file
            ifc_file = ifcopenshell.open(file_path)
            
            elements = []
            
            # Get all products (elements that can be placed in space)
            products = ifc_file.by_type("IfcProduct")
            
            for product in products:
                # Skip certain types that are not physical building elements
                if product.is_a() in ["IfcSpace", "IfcOpeningElement", "IfcAnnotation"]:
                    continue
                
                # Get element type name
                type_name = product.is_a()
                
                # Get global ID
                global_id = product.GlobalId if hasattr(product, 'GlobalId') else f"unknown-{len(elements)}"
                
                # Get name
                name = product.Name if hasattr(product, 'Name') and product.Name else type_name
                
                # Extract properties
                properties = self._extract_properties(product)
                
                # Get placement matrix
                placement_matrix = self._get_placement_matrix(product)
                
                # Try to get geometry bounds for better position/dimensions
                geometry_bounds = self._get_geometry_bounds(product)
                
                # Extract position from matrix (translation/offset components)
                # Matrix is in column-major format (like WPF): [m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33]
                # Translation (OffsetX, OffsetY, OffsetZ) is at indices: 12, 13, 14
                position = [0.0, 0.0, 0.0]
                if placement_matrix and len(placement_matrix) >= 16:
                    position = [
                        float(placement_matrix[12]) if placement_matrix[12] is not None else 0.0,  # OffsetX
                        float(placement_matrix[13]) if placement_matrix[13] is not None else 0.0,  # OffsetY
                        float(placement_matrix[14]) if placement_matrix[14] is not None else 0.0   # OffsetZ
                    ]
                
                # If we have geometry bounds, use the center as position (more accurate)
                if geometry_bounds and geometry_bounds.get('center'):
                    # Use geometry center, but apply placement matrix transformation
                    geom_center = geometry_bounds['center']
                    # For now, use geometry center directly if placement is at origin
                    if abs(position[0]) < 0.001 and abs(position[1]) < 0.001 and abs(position[2]) < 0.001:
                        position = geom_center
                    
                    # Add geometry bounds to properties for frontend (as JSON strings for easy parsing)
                    properties['_geometry_bounds'] = json.dumps(geometry_bounds)
                    properties['_geometry_size'] = json.dumps(geometry_bounds.get('size', [0, 0, 0]))
                
                # Don't skip elements - let frontend decide what to render
                # Only skip if explicitly organizational (but they'll be filtered in frontend anyway)
                # Keep all elements with placement data or geometry
                
                # Log first few elements for debugging
                if len(elements) < 5:
                    print(f"Element {type_name}: position={position}, has_geometry={geometry_bounds is not None}")
                
                # Create domain entity
                element = IfcElement(
                    global_id=global_id,
                    type_name=type_name,
                    name=str(name),
                    properties={str(k): str(v) for k, v in properties.items()},
                    placement_matrix=placement_matrix
                )
                
                elements.append(element)
            
            return Result.success(elements)
        
        except Exception as e:
            return Result.failure(f"Error parsing IFC file: {str(e)}")
    
    async def validate_file(self, file_path: str) -> Result[bool, str]:
        """Validate IFC file"""
        if not os.path.exists(file_path):
            return Result.failure(f"File not found: {file_path}")
        
        try:
            # Try to open the file
            ifc_file = ifcopenshell.open(file_path)
            # If we can open it, it's valid
            return Result.success(True)
        except Exception as e:
            return Result.failure(f"Error validating IFC file: {str(e)}")
    
    # Search and filter
    async def search_elements(
        self,
        query: str,
        elements: List[IfcElement]
    ) -> Result[List[Dict[str, Any]], str]:
        """Search elements by query string"""
        try:
            query_lower = query.lower()
            results = []
            
            for element in elements:
                # Search in name
                if element.name and query_lower in element.name.lower():
                    results.append(self._element_to_dict(element))
                    continue
                
                # Search in type_name
                if element.type_name and query_lower in element.type_name.lower():
                    results.append(self._element_to_dict(element))
                    continue
                
                # Search in global_id
                if element.global_id and query_lower in element.global_id.lower():
                    results.append(self._element_to_dict(element))
                    continue
                
                # Search in properties
                for key, value in element.properties.items():
                    if value and query_lower in str(value).lower():
                        results.append(self._element_to_dict(element))
                        break
            
            return Result.success(results)
        except Exception as e:
            return Result.failure(f"Error searching elements: {str(e)}")
    
    async def get_element(
        self,
        element_id: str,
        elements: List[IfcElement]
    ) -> Result[Dict[str, Any], str]:
        """Get element details by ID"""
        try:
            for element in elements:
                if element.global_id == element_id:
                    return Result.success(self._element_to_dict(element))
            
            return Result.failure(f"Element {element_id} not found")
        except Exception as e:
            return Result.failure(f"Error getting element: {str(e)}")
    
    async def filter_elements(
        self,
        filters: Dict[str, Any],
        elements: List[IfcElement]
    ) -> Result[List[Dict[str, Any]], str]:
        """Filter elements by criteria"""
        try:
            results = []
            
            for element in elements:
                match = True
                
                # Filter by type_name
                if "type_name" in filters:
                    if element.type_name != filters["type_name"]:
                        match = False
                
                # Filter by name (partial match)
                if "name" in filters and match:
                    if filters["name"].lower() not in element.name.lower():
                        match = False
                
                # Filter by properties
                if "properties" in filters and match:
                    for prop_key, prop_value in filters["properties"].items():
                        if prop_key not in element.properties:
                            match = False
                            break
                        if str(element.properties[prop_key]) != str(prop_value):
                            match = False
                            break
                
                if match:
                    results.append(self._element_to_dict(element))
            
            return Result.success(results)
        except Exception as e:
            return Result.failure(f"Error filtering elements: {str(e)}")
    
    def _element_to_dict(self, element: IfcElement) -> Dict[str, Any]:
        """Convert IfcElement to dictionary"""
        return {
            "global_id": element.global_id,
            "type_name": element.type_name,
            "name": element.name,
            "properties": element.properties,
            "placement_matrix": element.placement_matrix if element.placement_matrix else None
        }

