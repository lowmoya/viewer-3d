Two different forms of file states



1.  Render-ready State
    -   Components
        -   Nodes, holding a reference to a mesh
        -   Mesh, holding a set of primitives
        -   Primitive, holding a material and a set of rendering information
            -   Primitives are unique in storage, so they can hold their data
                directly
        -   Material, either a color or a texture id
    -   Ideas
        -   Have data at the ready for rendering when it comes to 'unique'
            structures, so rather than referencing indices somewhere, pull
            this data into their structures


2.  Storage-ready State
    -   Hold everything as specified in the official documentation, this form
        will be what's first read, and what's created by the other supported
        file formats



The following functions will return a file in the storage-ready state
-   OBJParser.createGLB(raw-data)
-   FBXParser.createGLB(raw-data)
-   GLBParser.createGLB(raw-data)
The following functions will return a file in the render-ready state
-   GLBParser.loadGLB(GLB-data)
