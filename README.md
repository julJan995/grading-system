# GradingSystem

Responsive Angular application for configuring school grade thresholds. Built with Angular 19, TypeScript, and Angular Material.

## Overview

GradingSystem allows educational institutions to configure and manage grade thresholds. The application provides an interface for setting percentage ranges and corresponding symbolic grades with real-time validation and auto-save functionality.

## Features

- Create, edit, and delete grade thresholds
- Automatic percentage range calculation
- Real-time form validation with conflict detection
- Auto-save with 1-second debounce
- Responsive design (mobile, tablet, desktop)
- Error handling with user-friendly messages

## Technology Stack

- Angular 19.2.13
- TypeScript
- SCSS
- Angular Material
- Angular Signals
- RxJS
- Jasmine & Karma for testing

## Installation

```bash
# Clone repository
git clone <repository-url>
cd grading-system

# Install dependencies
npm install

# Start development server
ng serve

Navigate to `http://localhost:4200/`
```

## Build

```bash
# Development build
ng build

# Production build
ng build --configuration=production
```

## Testing

```bash
# Run unit tests
ng test

# Run tests with coverage
ng test --code-coverage
```

## Project Structure

src/app/
├── components/layout/           # Header, sidebar components
├── features/grading-system-configuration/  # Main feature module
├── models/                      # TypeScript interfaces
├── services/                    # Angular services
└── styles/                      # SCSS variables and mixins

## Responsive Design

- **Mobile**: ≤ 576px - Stacked layout
- **Tablet**: 577px - 991px - Optimized layout  
- **Desktop**: ≥ 992px - Side-by-side panels

## API

The application uses a mocked REST API:

- `GET /grades` - List all grades
- `POST /grades` - Create new grade
- `GET /grades/{id}` - Get specific grade
- `PATCH /grades/{id}` - Update grade
- `DELETE /grades/{id}` - Delete grade

## Key Features

### Grade Management
- Add new grades with minimum percentage and symbolic name
- Edit existing grades with real-time updates
- Delete grades with confirmation
- Automatic conflict detection for duplicate percentages

### User Experience
- Auto-save after form changes
- Loading states during operations
- Comprehensive error handling
- Form validation with immediate feedback
