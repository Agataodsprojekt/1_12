"""Railway Oriented Programming - Result pattern"""
from typing import Generic, TypeVar, Union, Callable
from dataclasses import dataclass

TValue = TypeVar('TValue')
TError = TypeVar('TError')


@dataclass
class Result(Generic[TValue, TError]):
    """Result type for Railway Oriented Programming"""
    value: Union[TValue, None] = None
    error: Union[TError, None] = None
    
    @property
    def is_success(self) -> bool:
        """Check if result is success"""
        return self.error is None
    
    @property
    def is_failure(self) -> bool:
        """Check if result is failure"""
        return self.error is not None
    
    def map(self, func: Callable[[TValue], TValue]) -> 'Result[TValue, TError]':
        """Map success value"""
        if self.is_success:
            return Result(value=func(self.value))
        return self
    
    def bind(self, func: Callable[[TValue], 'Result[TValue, TError]']) -> 'Result[TValue, TError]':
        """Bind (flat map) result"""
        if self.is_success:
            return func(self.value)
        return self
    
    def on_success(self, func: Callable[[TValue], None]) -> 'Result[TValue, TError]':
        """Execute function on success"""
        if self.is_success:
            func(self.value)
        return self
    
    def on_failure(self, func: Callable[[TError], None]) -> 'Result[TValue, TError]':
        """Execute function on failure"""
        if self.is_failure:
            func(self.error)
        return self
    
    @staticmethod
    def success(value: TValue) -> 'Result[TValue, TError]':
        """Create success result"""
        return Result(value=value, error=None)
    
    @staticmethod
    def failure(error: TError) -> 'Result[TValue, TError]':
        """Create failure result"""
        return Result(value=None, error=error)

