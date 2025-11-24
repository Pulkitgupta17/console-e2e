#List of SERVER IPs
stage=172.16.235.7

option="${1}"

getServerIp() { 
    if [ $option == 'stage' ]
    then
        echo $stage
    fi
}

#Deploy code
echo "Deployment start"

# Check if environment option is provided
if [ -z "$option" ]; then
  echo "Error: Please pass the server name as an argument for deployment."
  exit 1
fi

echo "Valid Environment"
serverIp=172.16.235.50

if [ -z "$serverIp" ]; then
    echo "Failed to retrieve server IP. Enter valid environment name."
    exit 1
fi

echo $serverIp

# Step 1: Zip the build files
echo "Creating a zip folder of the frontend files..."
# tar -czf build.tar.gz -C ./build/e2eweb-testing .
tar -czf build.tar.gz -C ./dist . || { echo "Error: Failed to create build.tar.gz"; exit 1; }

# Step 2: Remove old files from the remote server
echo "Removing old files from the remote server..."
ssh root@$serverIp "rm -rf /var/www/html/*" || { echo "Error: Failed to remove old files from remote server"; exit 1; }

# Step 3: Transfer the zip file to the remote server
echo "Transferring the zip file to the remote server..."
scp build.tar.gz root@$serverIp:/var/www/html/ || { echo "Error: Failed to transfer build.tar.gz to remote server"; exit 1; }

# Step 4: Unzip the file on the remote server
echo "Extracting the zip on the remote server..."
ssh root@$serverIp "tar -xzf /var/www/html/build.tar.gz -C /var/www/html/" || { echo "Error: Failed to extract build.tar.gz on the remote server"; exit 1; }

# Step 5: Clean up local files
echo "Cleaning up..."
rm build.tar.gz

# Step 6: Remove the tar file on the remote server
ssh root@$serverIp "rm /var/www/html/build.tar.gz" || { echo "Error: Failed to remove build.tar.gz on the remote server"; exit 1; }

echo "Deployment done..." 
