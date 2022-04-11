# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2022-04-11
### Changed
- Updated to use PostCSS v8
- Updated to match newer version of `postcss-plugin-boilerplate`

## [0.2.1] - 2020-12-03
### Fixed
- Conditions in list of differently matching media queries do not leak

## [0.2.0] - 2020-08-26
### Added
- Custom filtering function

### Fixed
- Media query min width conditions equal to option max value or max width conditions equal to option min value are preserved
- Blocks with media queries covering option value range are collapsed

## [0.1.0] - 2020-08-17
### Added
- Filtering basic pixel width based media queries
