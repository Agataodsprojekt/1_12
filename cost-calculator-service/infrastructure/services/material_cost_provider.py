"""Material cost provider implementation"""
from typing import Dict, Any, List
from decimal import Decimal

from domain.interfaces.cost_provider import IMaterialCostProvider
from domain.entities.cost_breakdown import CostItem


class MaterialCostProvider(IMaterialCostProvider):
    """Calculates material costs based on weight/volume"""
    
    def get_provider_name(self) -> str:
        return "material"
    
    def can_calculate(self, element: Dict[str, Any]) -> bool:
        """Can calculate if element has material info"""
        properties = element.get('properties', {})
        return 'MATERIAL' in properties or 'Type.MATERIAL' in properties
    
    def calculate(self, element: Dict[str, Any], rules: Dict[str, Any]) -> List[CostItem]:
        """Calculate material costs"""
        properties = element.get('properties', {})
        material_prices = rules.get('material_prices', {})
        
        # Get material name
        material = properties.get('MATERIAL') or properties.get('Type.MATERIAL', 'UNKNOWN')
        
        if material not in material_prices:
            return []
        
        material_config = material_prices[material]
        unit = material_config.get('unit', 'kg')
        price_per_unit = Decimal(str(material_config.get('price_per_unit', 0)))
        
        # Try different ways to get quantity
        quantity = self._get_quantity(element, material_config)
        
        if quantity <= 0:
            return []
        
        total_price = quantity * price_per_unit
        
        return [CostItem(
            category='material',
            item_type=material,
            quantity=quantity,
            unit=unit,
            unit_price=price_per_unit,
            total_price=total_price,
            description=f"{material} material",
            element_id=element.get('global_id')
        )]
    
    def _get_quantity(self, element: Dict[str, Any], material_config: Dict[str, Any]) -> Decimal:
        """Get quantity based on material config and element properties"""
        properties = element.get('properties', {})
        unit = material_config.get('unit', 'kg')
        
        # Try NetWeight first (most accurate)
        if unit == 'kg':
            weight = self._try_get_property(properties, [
                'BaseQuantities.NetWeight',
                'NetWeight',
                'Weight'
            ])
            if weight > 0:
                return Decimal(str(weight))
            
            # Calculate from volume if density available
            density = material_config.get('density_kg_m3')
            if density:
                volume = self._try_get_property(properties, [
                    'BaseQuantities.NetVolume',
                    'NetVolume',
                    'Volume'
                ])
                if volume > 0:
                    # volume is in m³, convert to kg
                    return Decimal(str(volume * density))
                
                # Calculate from dimensions
                volume_from_dims = self._calculate_volume_from_dimensions(properties)
                if volume_from_dims > 0:
                    return Decimal(str(volume_from_dims * density))
        
        # For m³ units
        elif unit == 'm³':
            volume = self._try_get_property(properties, [
                'BaseQuantities.NetVolume',
                'NetVolume',
                'Volume'
            ])
            if volume > 0:
                return Decimal(str(volume))
            
            # Calculate from dimensions
            volume_from_dims = self._calculate_volume_from_dimensions(properties)
            if volume_from_dims > 0:
                return Decimal(str(volume_from_dims))
        
        return Decimal('0.00')
    
    def _try_get_property(self, properties: Dict[str, str], keys: List[str]) -> float:
        """Try to get numeric property value"""
        for key in keys:
            value = properties.get(key)
            if value:
                try:
                    return float(value)
                except (ValueError, TypeError):
                    continue
        return 0.0
    
    def _calculate_volume_from_dimensions(self, properties: Dict[str, str]) -> float:
        """Calculate volume from Width x Height x Length"""
        width = self._try_get_property(properties, [
            'BaseQuantities.Width', 'Width', 'w'
        ])
        height = self._try_get_property(properties, [
            'BaseQuantities.Height', 'Height', 'h'
        ])
        length = self._try_get_property(properties, [
            'BaseQuantities.Length', 'Length', 'l'
        ])
        
        if width > 0 and height > 0 and length > 0:
            # Assume dimensions are in mm, convert to m³
            volume_mm3 = width * height * length
            volume_m3 = volume_mm3 / 1_000_000_000
            return volume_m3
        
        return 0.0

