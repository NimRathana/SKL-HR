from setuptools import setup, Extension
from Cython.Build import cythonize
import os

extensions = []

for root, dirs, files in os.walk("app"):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            module = path[:-3].replace(os.sep, ".")

            extensions.append(
                Extension(
                    module,
                    [path]
                )
            )

setup(
    ext_modules=cythonize(
        extensions,
        compiler_directives={
            "language_level": 3,
            "annotation_typing": False,
        },
    )
)