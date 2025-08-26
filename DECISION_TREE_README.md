# Decision Tree Feature

This feature adds an interactive, editable decision tree to your application using ReactFlow and PostgreSQL.

## Features

- **Interactive Flow Editor**: Drag and drop nodes, create connections, and edit content
- **Real-time Database Sync**: All changes are automatically saved to PostgreSQL
- **Custom Node Types**: Editable nodes with title and description fields
- **CRUD Operations**: Create, read, update, and delete nodes and edges
- **Responsive Design**: Works on desktop and mobile devices

## Setup

### 1. Database Setup

First, ensure you have PostgreSQL running and accessible. Set your database connection string:

```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### 2. Install Dependencies

Install the required Python packages:

```bash
cd backend
pip install -r requirements.txt
```

### 3. Initialize Database

Run the database initialization script to create tables and sample data:

```bash
cd backend
python init_db.py
```

### 4. Start the Backend

Start the FastAPI backend server:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Install Frontend Dependencies

Install the new frontend dependencies:

```bash
npm install
```

### 6. Start the Frontend

Start the Next.js development server:

```bash
npm run dev
```

## Usage

### Accessing the Decision Tree

1. Navigate to your application
2. Click on the "Decision Tree" tab in the navigation
3. You'll see the interactive flow editor with sample data

### Creating Nodes

1. Click the "Add Node" button in the top-right corner
2. New nodes will appear with default titles and descriptions
3. Drag nodes to reposition them

### Editing Nodes

1. Click the edit icon (pencil) on any node
2. Modify the title and description
3. Click "Save" to persist changes to the database

### Creating Connections

1. Click and drag from one node's edge to another node
2. Connections are automatically saved to the database
3. You can delete connections by selecting and pressing Delete

### Deleting Elements

1. Select nodes or edges
2. Press Delete key or use the delete button on nodes
3. Changes are automatically synced to the database

## API Endpoints

The backend provides these REST endpoints:

- `GET /api/decision-tree` - Get all nodes and edges
- `POST /api/decision-tree/nodes` - Create a new node
- `PUT /api/decision-tree/nodes/{node_id}` - Update a node
- `DELETE /api/decision-tree/nodes/{node_id}` - Delete a node
- `POST /api/decision-tree/edges` - Create a new edge
- `DELETE /api/decision-tree/edges/{edge_id}` - Delete an edge

## Database Schema

### decision_tree_nodes
- `id`: Auto-incrementing primary key
- `node_id`: Unique identifier for the node
- `type`: Node type (e.g., 'custom')
- `position_x`, `position_y`: X,Y coordinates
- `data`: JSONB field containing node content
- `created_at`, `updated_at`: Timestamps

### decision_tree_edges
- `id`: Auto-incrementing primary key
- `edge_id`: Unique identifier for the edge
- `source`, `target`: References to node IDs
- `source_handle`, `target_handle`: Connection points
- `label`: Optional edge label
- `created_at`, `updated_at`: Timestamps

## Customization

### Adding New Node Types

1. Create a new component in `components/decisionTree.tsx`
2. Add it to the `nodeTypes` object
3. Update the backend to handle the new type

### Styling

The component uses Tailwind CSS and ShadCN components. You can customize:
- Node appearance by modifying the `CustomNode` component
- Flow controls by customizing ReactFlow props
- Colors and spacing using Tailwind classes

### Data Structure

Modify the `data` field structure in nodes to include additional fields:
- Add new form inputs to the edit mode
- Update the display logic in the view mode
- Ensure the backend handles the new data structure

## Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` environment variable
- Ensure PostgreSQL is running and accessible
- Check firewall settings if connecting remotely

### Frontend Errors

- Check browser console for JavaScript errors
- Verify all dependencies are installed
- Ensure the backend is running and accessible

### Data Not Persisting

- Check backend logs for database errors
- Verify database permissions
- Ensure the database tables were created correctly

## Performance Considerations

- Large decision trees (>100 nodes) may experience performance issues
- Consider implementing pagination or lazy loading for very large trees
- Database indexes on frequently queried fields can improve performance

## Security Notes

- The current implementation doesn't include authentication
- Consider adding user-specific decision trees
- Implement proper input validation and sanitization
- Add rate limiting for API endpoints in production 