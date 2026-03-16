# React-Based Template Editor

This directory contains the React frontend for the Print Client Template Editor, providing the same professional experience as the cloud app.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Development mode:**
   ```bash
   npm run dev
   ```
   This starts the development server at `http://localhost:3001` with hot reloading.

3. **Production build:**
   ```bash
   npm run build
   ```
   This builds the React app and places it in `static/dist/` for Flask to serve.

## 🏗️ Architecture

### Frontend (React)
- **Location**: `frontend/src/`
- **Framework**: React 18 + TypeScript
- **UI Library**: Material-UI v5 (same as cloud app)
- **Drag & Drop**: react-draggable (professional library)

### Backend (Flask)
- **Route**: `/template-editor` serves the React app
- **API**: `/create-label-template` handles template saving
- **Legacy**: `/template-editor-legacy` serves the old HTML version

## 📁 File Structure

```
print-client/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── LabelTemplateEditor.tsx    # Main template editor
│   │   ├── types/
│   │   │   └── index.ts                   # TypeScript interfaces
│   │   ├── App.tsx                        # Root React component
│   │   └── index.tsx                      # React entry point
│   └── public/
│       └── index.html                     # HTML template
├── static/dist/                           # Built React app (generated)
├── package.json                           # Node.js dependencies
├── webpack.config.js                      # Webpack configuration
├── tsconfig.json                          # TypeScript configuration
└── label_routes.py                        # Flask routes
```

## 🎯 Features

### ✅ **Same as Cloud App**
- **Material-UI Design System** - Identical visual design
- **Professional Drag & Drop** - react-draggable library
- **Real-time Field Editing** - Live property updates
- **TypeScript Safety** - Full type checking
- **Responsive Layout** - 3-panel Material Design layout

### ✅ **Template Editor Features**
- **Drag & Drop Fields** - Smooth repositioning on canvas
- **Field Properties Panel** - Font, color, alignment, position
- **Available Fields List** - Pre-defined + custom fields
- **Paper Size Selection** - Brother QL-800, Dymo, Godex 200i
- **Live Preview** - Real-time template visualization
- **Professional Save Flow** - Loading states & error handling

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start development server (same as dev)

### Development Server

The development server (`npm run dev`) runs on port 3001 and proxies API calls to the Flask backend on port 7010:

```javascript
// Automatic proxy configuration
proxy: {
  '/api': 'http://localhost:7010',
  '/create-label-template': 'http://localhost:7010',
}
```

### Integration with Flask

The Flask route serves the built React app:

```python
@label_bp.route("/template-editor", methods=["GET"])
def template_editor():
    """Serve the React-based template editor"""
    return send_from_directory('static/dist', 'index.html')
```

## 🎨 Styling

The React app uses the same Material-UI theme as the cloud app:

```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#fafafa' }
  }
});
```

## 🔄 Data Flow

1. **User Interface** - React components handle UI interactions
2. **State Management** - React hooks manage component state
3. **API Calls** - Fetch requests to Flask backend endpoints
4. **Template Saving** - POST to `/create-label-template`
5. **Navigation** - Redirect to main dashboard after save

## 🚀 Production Deployment

1. Build the React app: `npm run build`
2. The built files are placed in `static/dist/`
3. Flask serves the React app at `/template-editor`
4. No additional server setup required!

## 🔄 Comparison: React vs Legacy

| **Feature** | **Legacy (HTML/JS)** | **React Version** |
|-------------|---------------------|-------------------|
| **Drag Library** | Shopify Draggable (CDN) | react-draggable (npm) |
| **UI Framework** | Custom CSS + Material Icons | Material-UI v5 |
| **State Management** | Global variables | React hooks |
| **Type Safety** | None | Full TypeScript |
| **Component Reuse** | None | Modular React components |
| **Development** | Manual HTML editing | Hot reload + dev tools |
| **Maintenance** | Difficult | Easy with React patterns |

## 🎯 Benefits of React Version

- ✅ **Professional Architecture** - Same as cloud app
- ✅ **Type Safety** - Catch errors at compile time
- ✅ **Component Reusability** - Modular, maintainable code
- ✅ **Better DX** - Hot reload, debugging tools
- ✅ **Consistency** - Matches cloud app patterns
- ✅ **Future-proof** - Modern React ecosystem 