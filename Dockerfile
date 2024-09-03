# Use the official NGINX image from the Docker Hub
FROM nginx:latest

# Copy the HTML file to the NGINX HTML directory
COPY index.html /usr/share/nginx/html/index.html

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
