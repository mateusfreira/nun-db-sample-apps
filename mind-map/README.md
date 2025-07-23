# Mind Map - NunDB Example

A real-time collaborative mind mapping application built with NunDB. This example demonstrates how to create an interactive visual thinking tool that allows multiple users to brainstorm and organize ideas together in real-time. The app uses NunDB directly from CDN, making it completely self-contained.

## Features

- 🧠 **Visual thinking**: Create nodes and connect them to build mind maps
- 🤝 **Real-time collaboration**: Multiple users can work on the same mind map simultaneously
- 👥 **Multi-user workspaces**: Create or join named workspaces for team brainstorming
- 🎨 **Customizable nodes**: Edit text and choose from multiple colors
- 🔗 **Dynamic connections**: Drag between nodes to create relationships
- 💾 **Persistent storage**: Mind maps are automatically saved and synchronized per workspace
- 🎯 **Interactive tools**: Select, add nodes, connect, zoom, and pan
- 📱 **Responsive design**: Works on desktop and mobile devices

## How to Use

1. **Open the app**: Simply open `index.html` in your web browser (no installation required!)
2. **Choose workspace**: Enter a unique workspace name (e.g., "team-brainstorm", "project-ideas") to create or join a collaborative session
3. **Share with team**: Share the workspace name with team members - everyone with the same workspace name will see the same mind map
4. **Create nodes**: Click anywhere on the canvas to add new nodes
5. **Edit nodes**: Double-click any node to edit its text and color
6. **Connect ideas**: Use the connect tool to drag lines between related nodes
7. **Collaborate**: See real-time updates as team members add and modify nodes
8. **Navigate**: Use zoom and pan tools to explore large mind maps

> **Note**: The app loads NunDB directly from CDN, so you need an internet connection for it to work.

## What This Example Demonstrates

### NunDB Features Showcased

- **Real-time synchronization**: Changes update across all connected clients instantly
- **Persistent storage**: Mind maps are automatically saved and restored
- **Watch functionality**: Live updates when data changes from other users
- **Conflict-free collaboration**: Multiple users can work simultaneously without conflicts
- **CDN integration**: Loads NunDB directly from jsdelivr CDN

### Technical Implementation

- **Zero setup**: No local dependencies - everything loads from CDN
- **SVG-based rendering**: Scalable vector graphics for crisp visuals at any zoom level
- **Event-driven architecture**: Mouse and keyboard interactions for intuitive UX
- **Modal editing**: Clean interface for editing node properties
- **Responsive design**: Adapts to different screen sizes and orientations
- **Tool-based interaction**: Multiple interaction modes (select, add, connect)

## Code Structure

```
mind-map/
├── index.html          # Main HTML file with embedded UI structure
├── styles.css          # Stylesheet with responsive design
├── app.js             # JavaScript application logic
└── README.md          # This documentation
```

### Key Components

1. **MindMap Class**: Main application class handling all functionality
2. **Database Connection**: Connects to NunDB staging server
3. **Node Management**: Create, edit, delete, and move nodes
4. **Connection System**: Draw lines between nodes to show relationships
5. **Tool System**: Different interaction modes for various operations
6. **Modal Editor**: Interface for editing node text and colors
7. **Real-time Sync**: Live updates across all connected users

## Database Schema

Mind maps are stored in workspace-specific keys with two main data structures:

### Nodes (`mindmap_nodes_{workspace}`)
```javascript
{
  id: "node_1234567890_abc12",        // Unique node identifier
  text: "Main Idea",                   // Node display text
  x: 300,                             // X coordinate on canvas
  y: 200,                             // Y coordinate on canvas
  color: "#667eea",                   // Node background color
  createdBy: "user_abc123",           // User who created the node
  createdAt: 1640995200000            // Node creation timestamp
}
```

### Connections (`mindmap_connections_{workspace}`)
```javascript
{
  id: "conn_1234567890_def34",        // Unique connection identifier
  from: "node_1234567890_abc12",      // Source node ID
  to: "node_1234567890_ghi56",        // Target node ID
  createdBy: "user_abc123",           // User who created the connection
  createdAt: 1640995200000            // Connection creation timestamp
}
```

## User Interface

### Tools Available

- **🖱️ Select**: Click to select nodes, drag to move them
- **⭕ Add Node**: Click anywhere on canvas to create new nodes
- **🔗 Connect**: Click one node, then another to create connections
- **🔍 Zoom**: Zoom in/out for better navigation of large maps
- **🎯 Reset View**: Return to default zoom and position

### Keyboard Shortcuts

- **Delete**: Remove selected node and its connections
- **Escape**: Cancel current operation, deselect nodes
- **Double-click**: Edit node text and color

## Customization

You can easily customize this example:

- **Change database**: Update the connection URL in `app.js`
- **Modify styling**: Edit colors, sizes, and layouts in `styles.css`
- **Add features**: Extend the MindMap class with new functionality
- **Change node shapes**: Modify the SVG rendering in `renderNode()`
- **Add export**: Implement save/load functionality for different formats

## Real-time Collaboration

This app showcases NunDB's real-time capabilities with workspace isolation:

1. Open the app in multiple browser tabs or share the workspace name with team members
2. Enter the same workspace name to join the collaborative session
3. Create nodes in one tab/browser and watch them appear instantly in others
4. Move, edit, or connect nodes and see changes propagate immediately
5. All users in the same workspace see the same synchronized state
6. Different workspaces are completely isolated from each other

## Advanced Features

### Visual Feedback
- Hover effects on nodes and connections
- Selection highlighting
- Temporary connection preview while dragging
- Loading states and connection status

### Mobile Support
- Touch-friendly interface
- Responsive layout that adapts to mobile screens
- Optimized tool layout for smaller screens

### Performance
- Efficient rendering using SVG
- Minimal DOM updates for smooth real-time collaboration
- Optimized event handling for responsive interactions

## Next Steps (If you want to move beyond this example)

Try extending this example with:

- **Different node shapes**: Rectangles, diamonds, custom shapes
- **Rich text editing**: Markdown support, formatting options
- **Image support**: Add images to nodes
- **Templates**: Pre-built mind map templates
- **Export functionality**: Save as PNG, PDF, or other formats
- **User avatars**: Show who is currently editing
- **Version history**: Track and restore previous versions
- **Advanced connections**: Different line styles, labels on connections
- **Nested maps**: Sub-maps within nodes
- **Search functionality**: Find nodes by text content
- **Presentation mode**: Navigate through connected ideas linearly