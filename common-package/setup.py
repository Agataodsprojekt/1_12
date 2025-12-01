"""Common package setup"""
from setuptools import setup, find_packages

setup(
    name="ifc-common",
    version="1.0.0",
    description="Common utilities for IFC Construction Calculator microservices",
    packages=find_packages(),
    python_requires=">=3.11",
    install_requires=[
        "pydantic>=2.5.0",
        "pydantic-settings>=2.1.0",
    ],
)

