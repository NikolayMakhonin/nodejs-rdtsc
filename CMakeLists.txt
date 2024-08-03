# docs: https://nodejs.github.io/node-addon-examples/build-tools/cmake-js/
# example: https://github.com/nodejs/node-addon-examples/blob/main/src/8-tooling/build_with_cmake/node-addon-api/CMakeLists.txt

# Here are the lines required for all native modules built using CMake.js:
project(binding)
# Link with Node.js
include_directories(${CMAKE_JS_INC})
# Specify the source files
file(GLOB SOURCE_FILES "src/binding/binding.cc")
# Add the library
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${CMAKE_JS_SRC})
# Set the library suffix
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})

# Define NAPI_VERSION
add_definitions(-DNAPI_VERSION=3)

# node-addon-api
cmake_minimum_required(VERSION 3.9)
cmake_policy(SET CMP0042 NEW)
set(CMAKE_CXX_STANDARD 11)
# Include Node-API wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        )
string(REGEX REPLACE "[\r\n\"]" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
target_include_directories(${PROJECT_NAME} PRIVATE ${NODE_ADDON_API_DIR})

# Define the preprocessor macros
add_definitions(-DV8_DEPRECATION_WARNINGS=1)
